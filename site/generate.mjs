import { writeFileSync, mkdirSync } from 'fs';

const SQ = 'https://images.squarespace-cdn.com/content/v1/65b16f5513153c67a7dc2776/';

// Skip the site logo image that appears on every page
const SKIP = 'istockphoto-1159408533-612x612.jpg';

function nav(active, prefix='') {
  const links = [
    ['index.html', 'Dalton Corr'],
    ['work/index.html', 'Work'],
    // ['blog/index.html', 'Blog'],
    ['about.html', 'About'],
  ];
  return `
  <nav class="nav">
    <div>
      <ul class="nav-links"><li id="dot" class="dot" aria-hidden="true"></li>
        ${links.map(([href, label]) => {
          const isActive = label === active;
          const cls = isActive ? 'nav-link active' : 'nav-link';
          const aria = isActive ? ' aria-current="page"' : '';
          return `<li><a href="${prefix}${href}" class="${cls}"${aria}>${label}</a></li>`;
        }).join('\n        ')}
      </ul>
    </div>
    <span class="nav-footer">&copy; 2026 Dalton Corr</span>
  </nav>
  <div class="work-toolbar">
    <div class="filter-bar">
      <a href="${prefix}work/index.html#all" class="filter-btn active" data-filter="all">All</a>
      <a href="${prefix}work/index.html#design" class="filter-btn" data-filter="design">Design</a>
      <a href="${prefix}work/index.html#music" class="filter-btn" data-filter="music">Music</a>
      <a href="${prefix}work/index.html#art-direction" class="filter-btn" data-filter="art-direction">Art Direction</a>
      <a href="${prefix}work/index.html#illustration" class="filter-btn" data-filter="illustration">Illustration</a>
      <a href="${prefix}work/index.html#film-score" class="filter-btn" data-filter="film-score">Film Score</a>
      <a href="${prefix}work/index.html#branding" class="filter-btn" data-filter="branding">Branding</a>
    </div>
  </div>
  <div class="blog-toolbar">
    <div class="filter-bar">
      <a href="${prefix}blog/index.html#all" class="filter-btn active" data-filter="all">All</a>
      <a href="${prefix}blog/index.html#art" class="filter-btn" data-filter="art">Art</a>
      <a href="${prefix}blog/index.html#design" class="filter-btn" data-filter="design">Design</a>
      <a href="${prefix}blog/index.html#magic" class="filter-btn" data-filter="magic">Magic</a>
      <a href="${prefix}blog/index.html#venice" class="filter-btn" data-filter="venice">Venice</a>
      <a href="${prefix}blog/index.html#printmaking" class="filter-btn" data-filter="printmaking">Printmaking</a>
      <a href="${prefix}blog/index.html#photography" class="filter-btn" data-filter="photography">Photography</a>
      <a href="${prefix}blog/index.html#technology" class="filter-btn" data-filter="technology">Technology</a>
    </div>
  </div>
  <button class="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
  <div class="nav-overlay">
    <button class="nav-close" aria-label="Close menu">&times;</button>
    <a href="${prefix}index.html" class="nav-overlay-link">Dalton Corr</a>
    <a href="${prefix}work/index.html" class="nav-overlay-link">Work</a>
<!-- <a href="${prefix}blog/index.html" class="nav-overlay-link">Blog</a> -->
    <a href="${prefix}about.html" class="nav-overlay-link">About</a>
  </div>`;
}

function superscriptOrdinals(text) {
  return text.replace(/(\d)(st|nd|rd|th)\b/g, '$1<sup>$2</sup>');
}

function page(title, active, prefix, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${prefix}css/style.css">
</head>
<body>
  <a href="#main" class="sr-only">Skip to content</a>
  ${nav(active, prefix)}
  <div class="page-body">
    <main id="main">
      ${bodyHtml}
    </main>
  </div>
  <script src="${prefix}js/main.js" defer></script>
</body>
</html>`;
}

function imgTag(url, alt='') {
  if (url.includes(SKIP)) return '';
  const full = url.startsWith('http') ? url : SQ + url;
  return `<img src="${full}" alt="${alt}" loading="lazy">`;
}

/*
 * MASTER PROJECT PAGE TEMPLATE (based on HS21)
 * ─────────────────────────────────────────────
 * Structure:
 *   1. project-meta     — centered title (h1) + details line (uppercase, muted)
 *   2. project-body     — centered description paragraphs
 *   3. project-sections — repeating blocks, each with:
 *        h2             — section heading (centered, uppercase, bold)
 *        section-sub    — optional subtitle (centered, lowercase)
 *        project-gallery— masonry 2-col grid of images (click to lightbox)
 *   OR project-gallery  — flat masonry grid if no sections defined
 *   4. Last section gets 6rem bottom padding
 *
 * Data shape:
 *   { slug, title, details, body:[], sections:[{heading, sub?, images:[]}], images:[] }
 *   - If `sections` exists, images are grouped under headings
 *   - If only `images` exists, flat masonry gallery
 */
function projectPage(data) {
  const imgs = (data.images || []).filter(u => !u.includes(SKIP));
  let html = '';

  // Meta — top center, no hero image
  html += `<div class="project-meta">
        <h1>${superscriptOrdinals(data.title)}</h1>
        <p class="project-details">${superscriptOrdinals(data.details)}</p>
      </div>\n`;

  // Body text
  if (data.body && data.body.length > 0) {
    html += `<div class="project-body">\n`;
    for (const p of data.body) {
      html += `        <p>${superscriptOrdinals(p)}</p>\n`;
    }
    html += `      </div>\n`;
  }

  // Section headings + slideshow
  if (data.sections) {
    for (const sec of data.sections) {
      html += `<div class="project-section">
        <h2>${superscriptOrdinals(sec.heading)}</h2>
        ${sec.sub ? `<p class="section-sub">${superscriptOrdinals(sec.sub)}</p>` : ''}
        <div class="project-gallery">\n`;
      for (const img of sec.images) {
        html += `          <img src="${img}" alt="${sec.heading}" loading="lazy">\n`;
      }
      html += `        </div>
      </div>\n`;
    }
  } else if (imgs.length > 0) {
    html += `<div class="project-gallery">\n`;
    for (const img of imgs) {
      html += `        <img src="${img}" alt="${data.title}" loading="lazy">\n`;
    }
    html += `      </div>\n`;
  }

  return page(data.title + ' — Dalton Corr', 'Work', '../', html);
}

// =====================================================
// PROJECT DATA — all scraped content
// =====================================================

const projects = [
  {
    slug: 'hollyshorts-21',
    title: '21st Annual HollyShorts Film Festival',
    details: 'Art Director — TCL Chinese Theatres — Los Angeles, 2025',
    body: [
      'Work includes official 21st anniversary poster, merch design, badge design, award design, production design of the HollyShorts Film Festival, production design of the Alta Global Media Film Summit, production design of the 21st Annual HollyShorts Award Show.'
    ],
    sections: [
      { heading: 'Original art for the official 21st anniversary poster', images: [
        SQ+'1769130406202-9KPNT58V90QHR7TNG1EA/Poster+Small.png',
        SQ+'8bff560a-978e-485a-ad76-dc73db7959c6/%5BHS21%5D+Wide+Art+small.png',
      ]},
      { heading: 'Production Design', sub: 'step-and-repeats, billboards, theater lobby design, event signage, on-screen creative, award show design', images: [
        // Original site order
        SQ+'b296a4d6-5238-42bd-9dfc-e91e1dd513bf/IMG_9135.jpeg',
        SQ+'699c6e01-2259-4f59-939a-14693acae2dd/IMG_1355.jpeg',
        SQ+'33ad4da3-1732-4108-9809-4fb5559b2994/IMG_9191.jpeg',
        SQ+'79be7150-4aef-46c6-87a1-63d1be5a5be6/54715467764_2357977844_k.jpg',
        SQ+'5b34c1f5-a868-478d-aff5-c78e3d512caf/IMG_9196.jpeg',
        SQ+'b426fa30-6f1a-4a34-b33f-5e6dee8b16f7/54729116567_902409cbf6_o.jpg',
        SQ+'97793317-da82-400f-af97-b741b3363a3e/54728644752_7dabb5f045_o+2.jpg',
        SQ+'9850f573-1c31-498c-981f-e07f84490bbc/IMG_8331.jpeg',
        SQ+'7cc074aa-f7df-4cdf-8cf6-18a8c2d021f0/IMG_7601.jpeg',
        SQ+'bd076d13-6ec6-449e-9da0-ee993a872dee/IMG_9129.jpeg',
        SQ+'73b44daa-d5e1-4ba0-96dd-aa649b2a0339/IMG_9169.jpeg',
        SQ+'a2fbc3a9-f9c3-4555-a6cf-4fc12f7684eb/IMG_9120.jpeg',
        SQ+'5015d2b3-e95d-410a-87a5-33c3e6a07f8d/IMG_9161.jpeg',
        SQ+'09a30f26-4c68-4b60-926a-b4256b967cce/54720456147_54381b7e60_k.jpg',
        SQ+'e2a27482-2c52-4e06-807f-9f0bc5a95a80/54730171974_deadfd9b5a_k.jpg',
        SQ+'70c4fa01-33b5-4222-8eba-28d3251af95b/54729688633_66abfafdb4_k+2.jpg',
        SQ+'7225f61d-8c37-46bf-a35d-81eae88eb165/IMG_9203.jpeg',
        SQ+'c8095b63-f528-4a58-8ba2-0bf04124cd66/54724030116_753d0bfb1b_k-2.jpg',
        SQ+'bf114191-7c0d-4fb3-a7d6-68cfad2de7a1/54730124538_bda119a419_k.jpg',
      ]},
      { heading: 'Merch Designs', images: [
        SQ+'8a056db5-3da1-468a-9fa3-324fba867326/unisex-staple-t-shirt-white-front-698401c5685d5.png',
        SQ+'dc5a68d5-f620-4496-8695-a655c8bdd8c0/denim-bucket-hat-light-denim-front-6984024c95149.png',
        SQ+'04f54081-0b02-40e2-b652-004254a53c2d/all-over-print-unisex-athletic-long-shorts-white-front-69840342bb1ff.png',
        SQ+'bba8d298-4687-4168-b0c6-2caec8550c04/embroidered-crew-socks-white-right-698402c048c24.png',
        SQ+'58c5d890-16fd-4462-b482-dda98afdfc75/basic-unisex-windbreaker-navy-front-6984045152508.png',
        SQ+'f1570ed8-5fe7-47ae-92d3-88e83236e151/basic-unisex-windbreaker-navy-back-6984045152832.png',
        SQ+'e0cecef5-aac0-4a30-a19b-149807cfc325/unisex-staple-t-shirt-white-zoomed-in-698401c568c8a.png',
      ]},
      { heading: 'Badge Designs', images: [
        // Original site order
        SQ+'6e821d49-9f37-48d3-b79d-9e3570d38915/54724868558_07da09f1b9_o+2.jpg',
        SQ+'a23d7795-27e1-4186-87fa-73b3ff85b1b2/All+Access.png',
        SQ+'15ae68ff-2e4b-4d32-96ca-c6f01baabee7/Day+Pass.png',
        SQ+'24c6a621-fa8c-4f27-b9a1-e4e72a368ba5/Filmmaker+Pass.png',
        SQ+'6820e806-fe39-4eb7-a2bb-0ce8870a53d3/Staff.png',
        SQ+'ec0f94d6-bfd2-4f17-b0da-5359df1e3a97/Press.png',
        SQ+'0131bff4-d5fd-42b6-99fb-9b8a2decb491/Film+Summit.png',
        SQ+'7302c3d4-b7f1-4f1f-8c77-e1d0e835456a/Sponsor.png',
      ]},
      { heading: 'Award Design', images: [
        SQ+'e4461385-8d36-406f-801a-1f11978fd07f/53934756624_a6f1e28362_o.jpg',
        SQ+'740c3214-7910-4012-9d40-d2721d8f7286/54730167803_2bc61390e3_6k.jpg',
        SQ+'00ecdae1-efb9-41a7-964a-6a31daebc626/IMG_5361.jpeg',
        SQ+'878edac3-5b1d-42e4-8384-95169a3606c2/54729339672_1f589a7437_h.jpg',
        SQ+'cabbba29-3b91-4539-9307-fa02e4e94034/54728636529_a2e7c6a3cf_4k+2.jpg',
        SQ+'6b1012f8-93be-4be8-abe5-d29862323641/Group+8.png',
        SQ+'3342b5d5-d6eb-438b-b905-5395856ede2e/Placcard+one.png',
      ]},
    ],
    images: [SQ+'1769130406202-9KPNT58V90QHR7TNG1EA/Poster+Small.png'],
  },
  {
    slug: 'hollyshorts-comedy',
    title: 'HollyShorts Comedy 2025',
    details: 'Art Director — HollyShorts — Los Angeles, May 2025',
    body: [
      'Led the redesign of the Hollywood Comedy Short Film Festival into HollyShorts Comedy, establishing a bold new visual identity aligned with the parent HollyShorts brand.',
      'The rebrand included new logo, color palette, and typography, along with a comprehensive design system spanning print, digital, and event assets.',
      'Work includes: festival poster, official website, interactive AR activations, on-screen graphics, award show design, social media assets, festival badges, merchandise, and additional collateral.',
    ],
    images: [
      SQ+'5bcfa0f7-342f-4184-9f60-124cf16ee80c/Poster_.png',
      SQ+'48092d7c-61c5-43b0-878f-2abe6dd1e8bf/HSC9+Logo.png',
      SQ+'677c906e-c06b-4ca3-93c4-d8b7f743982a/Badges.png',
      SQ+'0e8b9da0-53e8-4048-a7d0-782b15a26914/IMG_3070.jpeg',
      SQ+'2f6f8db0-e95d-4de3-b9db-9ba25e20f38f/IMG_8007.jpeg',
      SQ+'05634fdd-e404-4426-babe-fd9beb15bcb0/IMG_8048.jpeg',
      SQ+'211af4dc-361a-46ed-96c7-b9e66b7b2db8/IMG_8077.jpeg',
      SQ+'bc268835-f32e-4454-a8d2-d192d8a1b149/Comedy+All+Access.png',
    ],
  },
  {
    slug: 'hollyshorts-london',
    title: 'HollyShorts London 2025',
    details: 'Creative Director — HollyShorts Film Festival — London, June 2025',
    body: [
      'Led creative direction and design for the inaugural HollyShorts London, establishing a new visual identity for the festival\'s international expansion.',
      'Built a city-specific system that stayed grounded in the parent brand while incorporating UK cinematic culture and tone.',
      'Work includes: festival poster, custom London branding package, digital marketing rollout, official website assets, motion graphics, social media templates, screening visuals, badges, merchandise, and print collateral.',
    ],
    images: [
      SQ+'db9db7ef-1609-4ed7-a4e8-3af56d7ac07f/472232574_3853868371592674_5703217189292259182_n.jpg',
      SQ+'95106dc5-9c8b-467b-bd68-d8b12338b2c4/468035841_602743562326775_6681752195368308140_n.jpg',
      SQ+'0b06e97f-6b65-4e2b-b8c4-e44cb1314c8e/465921008_929866422409253_6811404960256833731_n.jpg',
      SQ+'1cb78dca-34c4-46ed-96b5-72c1a2df6ff6/472304542_844055327752181_783869732097309527_n.jpg',
      SQ+'4fbdb25f-7047-4277-95b6-015f09d316e6/472298236_1128974298601453_1361862241833342341_n.jpg',
      SQ+'470d96f8-7bdb-4855-b290-63c1f0050564/472404434_625409833255136_3559600277865683536_n.jpg',
      SQ+'a440a203-6596-48ca-87d0-70aecb98b25e/470934486_8384437738328269_4397251221193907368_n.jpg',
      SQ+'2e4626b2-22a6-41f1-b5f2-79ba10ea1332/470935988_8709149192525956_7029747810375016340_n.jpg',
      SQ+'c219d93a-4a3e-4283-99f6-63877c242bbe/470955319_490966800142874_1986426474110815044_n.jpg',
      SQ+'45df6044-f681-40ab-aaf8-458820fcb391/470973968_1089669722564324_1205839330410274054_n.jpg',
      SQ+'dad8a8c7-e92a-480f-9c5c-bf8c596d18c4/472239287_919153263653328_1023683448985257053_n.jpg',
      SQ+'717f080f-b4ea-48d9-b21a-6a537dc44a77/472319687_1248458226224122_4616341925662061820_n.jpg',
      SQ+'3bfb433d-2199-4f4d-be6d-dd484dcde68a/472215280_455677710746912_527048242292983217_n.jpg',
      SQ+'6d8cf5dd-40f6-4794-81ad-f2cc6414a870/472338709_906072598408296_1268345784545495665_n.jpg',
      SQ+'31145f00-6352-43f6-bb11-bed2f851344e/472289667_1110353980248420_5092475038890263860_n.jpg',
      SQ+'ed6a78de-5d05-4444-835f-2d09255f5b1e/472032168_1119931572853821_1601451983331609380_n.jpg',
      SQ+'8e6fe173-16e3-4665-ae7b-4de3858fd74a/472233077_965652965466096_2612320933165423722_n.jpg',
      SQ+'c01c418d-7956-4065-a4f9-3bd953144ac9/472282706_2672610159793315_8925558514694169954_n.jpg',
      SQ+'67a981d9-08f3-40bd-bea5-50136531fefb/472299514_1288710968947905_26550059122749492_n.jpg',
      SQ+'899b0ed4-eac1-4488-b52b-6789647eb0d2/472535837_1292371765423253_6585880662196887620_n.jpg',
      SQ+'345bc161-b938-4632-893d-86aadb0eb0df/470902458_1063107142239102_2357780928962574053_n.jpg',
      SQ+'6db05950-3573-48ed-abab-d53cfe9860e1/470902458_1114380277067225_5084351201793450172_n.jpg',
      SQ+'2c246270-d2d0-49f2-9c2c-b3bae90519a1/472219700_598859572550227_630615428287595569_n.jpg',
      SQ+'71a84ae4-be96-4333-8cd1-e4d9482dffa4/470974909_1144791567082464_9018254643167477948_n.jpg',
      SQ+'a8211e69-94a0-4b9d-9053-c69aa07c396f/470915840_1336401237523614_3406730855566434780_n.jpg',
      SQ+'bc997637-7e64-4953-a114-1872bc0aae5e/471848666_966271662078514_1402179483172216724_n.jpg',
      SQ+'e58e4ab9-d2f7-4b4f-9954-f4e76a154e13/470920892_1109053537614310_3234290971082036391_n.jpg',
      SQ+'73cea7b0-39a1-4116-909d-f18a7603064f/475034490_18483931930059266_4745912697019093148_n.jpg',
      SQ+'4cc4c8d8-96ac-4cc4-a165-9494cd0eadde/467161315_9268264916541761_8938118665322276173_n.jpg',
      SQ+'e5177665-06c2-4ee3-a693-aad7fa979a7d/467547126_1143817687357323_8782681667539085404_n.jpg',
      SQ+'df0e05cb-950c-4b43-bac6-b36b88e215a2/467764830_1108524167295604_4359965425020676631_n.jpg',
      SQ+'d58d45f7-8492-43ee-8a1f-004a81a8b260/467768458_1529889977730602_6202684720290138855_n.jpg',
      SQ+'1c6d2f44-b0bc-4219-b76c-cb9ddb357a42/467901103_1102594291272679_5813423583481103539_n.jpg',
      SQ+'f29411b9-919f-45c4-8850-c0ab098ae3c8/467965295_915772966784885_5079646673214719647_n.jpg',
      SQ+'58597b1f-0d89-4141-9316-afa2fc7323f8/467970255_1282304546285408_7499324709300164637_n.jpg',
    ],
  },
  {
    slug: 'cannes-2024',
    title: 'Cannes 2024',
    details: 'Illustrator — Kodak / Cannes Film Festival — Cannes, France, 2024',
    body: ['Original illustrations and poster design for events at the 2024 Cannes Film Festival hosted by Kodak.'],
    images: [
      SQ+'ecd8f403-c0b0-48d7-8143-d96ab4ffacb0/Lorem+3.png',
      SQ+'f0c1bbe5-fd5d-4cea-a8be-bc46b45dafac/Cannes+2024+Artwork+2.png',
      SQ+'a8966df5-c012-427f-bb0d-c40e22b64670/Cannes+2024+Artwork.png',
      SQ+'cd5980ef-018a-423d-8cb8-8eb4173f9aba/Cannes+2024+Artwork+6.png',
    ],
  },
  {
    slug: 'hollyshortswebsite',
    title: 'Hollyshorts.com',
    details: 'Website Designer — HollyShorts Film Festival',
    body: ['Website design for Hollyshorts.com, official website of the Oscar-Qualifying\u00AE Film Festival.'],
    images: [SQ+'c372065b-9dbd-49ed-88fc-a4770e773c54/HS+website.png'],
  },
  {
    slug: 'hdtracks',
    title: 'HDtracks',
    details: 'Director of Marketing, Lead Designer — HDtracks',
    body: [
      'HDtracks is the world\u2019s leading high-resolution music store. HDtracks underwent a complete rebranding and redesign of its website in 2019. The redesign included building a new website from the ground up, establishing database storage, UX/UI design, updated branding, logos, and ad campaigns.',
      'The rebranding and redesign resulted in an increase in customer retention and sales, making HDtracks the most user-friendly Hi-Res download music store.',
    ],
    images: [
      SQ+'957271da-c191-4e1e-b0a4-f8c8c869ce2c/HDtrackswide.png',
      SQ+'7581a752-75f4-4695-a491-abefdc6e3bf4/HDtracks%2BSplashPage%2BMock%2BUp.png',
      SQ+'d9ac5de5-7879-4fef-a4b5-fc71361dcfae/Screen%2BShot%2B2021-05-10%2Bat%2B12.58.46%2BPM.png',
      SQ+'a62c60aa-2c4c-43a9-a44a-b23e85ab85b4/Screen%2BShot%2B2021-05-10%2Bat%2B1.04.37%2BPM.png',
      SQ+'d23f8b13-7d55-4176-9cf2-3ea056b264df/Screen%2BShot%2B2021-05-10%2Bat%2B1.06.42%2BPM.png',
      SQ+'c1668482-f769-4095-830a-25222857d6c2/Chuck.png',
      SQ+'317f07ae-e61a-4762-bb40-10f5976a36af/Screen%2BShot%2B2021-05-10%2Bat%2B1.18.22%2BPM.png',
      SQ+'8f748bec-5e3b-4bd0-b3ef-5828a722f7b5/Screen%2BShot%2B2021-05-10%2Bat%2B1.18.33%2BPM.png',
      SQ+'f5d9c04e-5944-4eb4-88b1-37e7b2e17ef1/10470178_663675363703231_3821372901395509111_o.jpg',
      SQ+'15450fea-1360-4900-910f-5592e86b9a06/65303997_2952501178124033_8095062357006352384_n.png',
      SQ+'3997b91e-fe53-48ef-9920-0e38590a62f2/Screen%2BShot%2B2020-09-16%2Bat%2B12.17.22%2BPM.png',
      SQ+'bbe3b4a5-d138-48cb-b36a-5b29abdc5929/Screen%2BShot%2B2021-05-10%2Bat%2B1.17.14%2BPM.png',
    ],
  },
  {
    slug: 'hcsff8',
    title: '8th Annual Hollywood Comedy Shorts Film Festival',
    details: 'Art Director — Los Angeles, California — May 2024',
    body: [],
    images: [
      SQ+'31226c67-c4b3-4e32-914b-cbc1c3653dcc/Kaledescope+2.jpg',
      SQ+'027150cf-0322-44ae-ac30-d8f9afcc8118/53697456816_d24a11792c_k.jpg',
      SQ+'2747cba0-69c2-4abb-9dd0-a2eee4512738/%5Blarge%5D+2024+Hollywood+Comedy+Short+Film+Festival+Poster.jpg',
      SQ+'844955fa-3a07-467e-8280-0a09cbcf221e/53697840444_86a9f3b229_k.jpg',
      SQ+'b76a0e15-627f-4e6b-b4b6-40c99d1a3f7c/53697834414_3f0a308c59_k.jpg',
      SQ+'d54885c1-921b-4d0a-bd69-9271e855b258/IMG_4414.jpeg',
      SQ+'19a16e51-f107-4418-b45f-7e047a6237b0/IMG_4416.jpeg',
      SQ+'2bc58aac-b7b7-453f-8ba3-a7dd723748d6/IMG_4328.jpeg',
      SQ+'a366612f-3df9-46c2-9d5b-ae6f07774d7d/IMG_4299.jpeg',
      SQ+'9deaf3f3-10ef-47ad-9a67-657b22c10a69/IMG_4332.jpeg',
      SQ+'8d8b110b-9832-444a-994f-971c20ea83e9/Kaledescope+2.png',
      SQ+'d4529ff0-05fd-4850-9693-5cf0c3fc7581/Kaledescope+3.png',
      SQ+'81506573-af4b-478d-876c-e7bc4d182d2a/Kaledescope+10.png',
      SQ+'987bc39c-67a0-4398-bdf7-443362b425fe/All+Access.png',
      SQ+'6842144c-44e5-4aa9-b4fa-a65c8312ea26/Day+One+Pass.png',
      SQ+'67664bb2-7379-4ab7-83e7-0c83fb7224c6/Day+Two+Pass.png',
      SQ+'bb783705-1319-4fbb-b0c5-5d4527c11ff8/Press.png',
      SQ+'45fd1961-c970-484c-aa9e-53edf6a36923/Screenwriter.png',
      SQ+'a6e49bc7-ffde-4687-93bb-ed289d1078dd/Staff.png',
      SQ+'a8dfa02c-09d8-43be-9842-0baac4403c51/Intro.png',
      SQ+'5db832eb-a8b0-451d-9a21-5235944f9652/Both.png',
      SQ+'825e35ac-0566-4954-8077-8a38555b401e/Saturday.png',
      SQ+'20ab7a11-df18-4318-84d3-5a0eab95280c/Sunday.png',
      SQ+'c54a2eaf-3ac0-419d-bc5b-96544e902915/Page+1.png',
      SQ+'996f00a7-0c0c-406a-8019-18bdcee853ad/Alternative+Comedy.png',
      SQ+'22c69c86-0baa-4f06-863b-bcb7a1636c1d/Cringe.png',
    ],
  },
  {
    slug: 'nice-knives',
    title: 'Nice Knives',
    details: 'Poster Designer — Directed by Connor Copeland — BAM In Motion — New York City, 2023',
    body: [],
    images: [SQ+'a76ca1c6-555d-436d-bff0-8e3c686d706f/Nice+Knives+poster+copy+2.png'],
  },
  {
    slug: 'skyfire-artists',
    title: 'Skyfire Artists',
    details: 'Brand Designer — Los Angeles, 2024',
    body: ['Created all assets for the Skyfire Artists brand, including logos, merchandise, and graphics for website and socials.'],
    images: [
      SQ+'0f9d7993-1bbd-4353-9fad-c3c4a2bc0118/SA+Tall+-+White.png',
      SQ+'000778d4-ca94-40e5-a166-8b7e8888d958/SA+Tall+-+Black.png',
      SQ+'a4d56b0b-55ac-47f6-80c0-c78a32c89d00/Sign.png',
      SQ+'f26871f0-c397-4625-acd7-28ac9150d9f7/Sign+2.png',
      SQ+'2f442ab0-bfb0-4aaf-9a1f-6005aaae26de/Card.png',
      SQ+'2c84ddc8-fc66-42b1-a2a1-f027ddb9aa7c/Card+2.png',
      SQ+'6b17116e-c5b4-4f15-bf98-6f700f064711/Hat+3.png',
      SQ+'e0aa1229-b6e4-4597-b03e-14d056eefa62/Hat+4.png',
      SQ+'b9488ff8-6392-43a9-8b94-b518677c64ed/SA+Hat+2.png',
      SQ+'86299942-3446-411e-bf49-fde033563d49/SA+Shirt.png',
    ],
  },
  {
    slug: 'hollyshorts19',
    title: '19th Annual HollyShorts Film Festival',
    details: 'Art Director, Lead Designer — TCL Chinese Theatres — Hollywood, August 2023',
    body: ['Collaborated with executive team to develop the look-and-feel of the festival. Created dozens of original artworks for posters, decorations, badges, merchandise, billboards, online media, and event invitations. Managed design team to maintain consistency across all physical and digital media.'],
    images: [
      SQ+'1febf6c8-a6c8-4572-b96b-3e1c325e8e10/HollyShorts+Wide.png',
      SQ+'95af7d28-f0d7-4ea7-8c1a-073abd121f53/Hollyshorts%2B2023%2BPoster.png',
      SQ+'44d51de0-8c23-4eee-999c-e52ea845102c/IMG_2157.jpg',
      SQ+'0682afc9-fc64-42cb-921f-fa1b43f8c676/IMG_2159.jpg',
      SQ+'d2870306-32b5-4b98-b8ce-df91d183bd12/IMG_2163.jpeg',
      SQ+'a91c49b5-2b82-4d16-b67f-3d9d94626221/IMG_2162.jpeg',
      SQ+'a184cb47-f608-4c7c-bba7-1c0baa175b16/53116870852_38ed7647c2_o.jpg',
      SQ+'418c2288-6e79-4a22-b57b-4d67c2ce0f8a/IMG_2106.jpeg',
      SQ+'4beaed3d-18a0-4862-82be-f333b7061bad/53129550845_82942014eb_o.jpg',
      SQ+'29630714-1a1d-47ce-ab36-3760af06167a/IMG_2222.jpeg',
      SQ+'58b6ae63-7958-45a8-9a02-2de668243323/Steven.png',
      SQ+'e5c50ab8-628a-44d8-9d0c-6ff15fb922c4/IMG_2114.jpeg',
      SQ+'d74c8cc7-490f-424d-98a4-fc2010ca7489/53116882592_c5664cc898_o.jpg',
      SQ+'0da2577f-9c80-49b2-9d4a-31eedb4557d2/BitPix.png',
      SQ+'01d7eb21-a8df-4493-a7e6-4d3628c92d79/BitPix%2BAward%2BWinners%2BBundle.png',
      SQ+'039d19cc-d01f-4d4c-914f-5cbea82a81ae/Day%2BPass.png',
      SQ+'754bcb79-b1fd-44fd-80d0-f79b90b355f5/Staff.png',
      SQ+'809c1c09-4c25-4c72-960b-87f0818db254/All%2BAccess%2BA.png',
      SQ+'489d25ae-85fb-46e0-88fe-6bb029dcef49/All%2BAccess%2BB.png',
      SQ+'d08f84b7-cf73-4866-b5c6-748ea5ba5fea/All%2BAccess%2BC.png',
      SQ+'2b15a866-f267-4a42-9279-872ad6b8aaf4/All%2BAccess%2BD.png',
      SQ+'e95bdf29-ca84-4d75-8c51-5c4274a13168/All%2BAccess%2BE.png',
      SQ+'819e799c-5aed-40de-8a58-321922d9636e/All%2BAccess%2BF.png',
      SQ+'b2f25472-fd47-45ff-b698-89f9f45b7aa4/Filmmaker%2BA.png',
      SQ+'b2097dc0-7453-4182-a144-7261b990b104/Filmmaker%2BB.png',
      SQ+'2146e6cd-fb72-431c-9ff7-8b4a8a460acf/Filmmaker%2BC.png',
      SQ+'ff4b019f-54d7-472d-b2f4-3e32d6daf13e/Filmmaker%2BD.png',
      SQ+'8a5bec0d-94ab-4e79-b71d-13bdadbeb7ed/Filmmaker%2BE.png',
      SQ+'6203ea52-7a49-462c-a37d-27cc370c6940/Press%2BA.png',
      SQ+'57ec2f3b-e450-4106-8304-807124d4a9e3/Press%2BB.png',
      SQ+'cf9045d8-2e0a-433f-aaf5-028bdf2d13b0/Screenwriter%2BA.png',
      SQ+'911c26c4-0c57-4a4f-92d3-d936df7a5414/Screenwriter%2BB.png',
      SQ+'3e6e067b-0530-4e3d-b3ce-29f57e024b57/Screenwriter%2BC.png',
      SQ+'ca2ec636-93ab-47a2-9ed7-57f38355b366/Sponsor.png',
    ],
  },
  {
    slug: 'miles-regis',
    title: 'Miles Regis',
    details: 'Illustrator — Los Angeles, 2023',
    body: ['Hand-created illustrations adapting Miles Regis\u2019s paintings into black-white illustrations for his upcoming coloring book.'],
    images: [
      SQ+'f9e042b0-89d4-4a62-8d30-44095e2aed5a/76586FD6-765B-4167-99DA-DFDDB515A8BF.JPG',
      SQ+'5c578437-76f3-4264-b110-b43e00b6931e/IMG_3876.jpg',
      SQ+'0cf23f80-fbde-4e83-96ba-764e63f51f90/%5BMiles%5D+Does+My+Shirt+Have+That+Much+Power.png',
      SQ+'16b57aba-d22d-4227-b11b-ab9c11e36bde/%5BMiles%5D+Respect+My+Pronouns.png',
    ],
  },
  {
    slug: 'survived-by',
    title: 'Survived By',
    details: 'Poster Designer — Director K.D. Chalk — Los Angeles, 2023',
    body: [],
    images: [SQ+'9bcbf459-a523-42bc-9c71-926c9b4221c1/Survived+By+-+Final+Large.jpg'],
  },
  {
    slug: 'feeling',
    title: 'Let This Feeling Go',
    details: 'Poster Designer — Director Andrew De Zen — Los Angeles, 2023',
    body: [],
    images: [
      SQ+'1bea2a66-d66f-4af4-9a0d-db261234f851/Poster+5+%28title%29+copy+2.png',
      SQ+'fc299bde-7be0-4f6c-afb3-595a9e2f1866/Poster%2B1G%2B%28title%29%2Bcopy.png',
      SQ+'f7ece1af-d4c2-45c5-b1bb-a30d4b002caf/Poster%2B5%2B%28title%29%2Bcopy.png',
    ],
  },
  {
    slug: 'welcome-home',
    title: 'Welcome Home',
    details: 'Poster Designer — Director Jo Rochelle',
    body: [],
    images: [
      SQ+'7ee884d9-62a1-4095-a579-82ce941738ec/Welcome+Home+poster+B1.png',
      SQ+'625a3a14-bea7-4b37-93ec-0613ff86d1ed/Welcome+Home+poster+3A.png',
    ],
  },
  {
    slug: 'timewriter',
    title: 'Timewriter',
    details: 'Art Department — Director Ryan Luevano — Los Angeles, 2023',
    body: [],
    images: [SQ+'1d8c6725-627f-48f7-8123-de4e33f2b370/MV5BOGViZmEwNDktODIwNS00MzU4LWE3YWEtOTE3MGU3Y2ZkNjg0XkEyXkFqcGdeQXVyMTQ5MTM4NDY4._V1_.jpg'],
  },
  {
    slug: 'hcsff7',
    title: '7th Annual Hollywood Comedy Shorts Film Festival',
    details: 'Lead Designer — Look Cinemas — Los Angeles, April 2023',
    body: ['Lead creative team to develop the look-and-feel of the festival, including posters, badges, social media, and event decor.'],
    images: [
      SQ+'7125ae04-5aee-41ce-8b26-70e41bde4ef3/52840583340_8769e3c2a4_h.jpg',
      SQ+'e35c86c1-0ca8-48c4-87af-5c0ed8236c06/Blue%2B3.png',
      SQ+'b48c34ea-02d4-4b3c-bd65-25eed9b96530/Red%2B2-1.png',
      SQ+'0550cef1-c648-4762-9cf7-a1a93300d137/52840583340_8769e3c2a4_h.jpg',
      SQ+'778ff0b1-f9cc-44dc-a6ac-f31eb5273cc6/52841097138_a7f35b76ac_h.jpg',
      SQ+'162d7856-366a-4536-a505-67e0a78c1a53/52840085407_068c6fad26_h.jpg',
      SQ+'b4d05030-a869-4cec-a440-94287fdc397f/52841710376_219789baca_h.jpg',
      SQ+'24ec1c6b-9896-4aa5-bbbf-133479ad96bb/52840170211_5916cc291b_h.jpg',
      SQ+'ae3ee83c-d082-4d05-a8e2-4644a28424db/52840614108_d24f1e125a_h.jpg',
      SQ+'d1223997-48cf-466b-aafb-446776f9033a/Yellow%2B2-1.png',
      SQ+'e66436d0-5a43-4014-9124-1aa1e3975d99/Black-1.png',
      SQ+'a3965233-26c6-4eb8-9d9b-35ae096cd3f1/All%2BAccess.png',
      SQ+'2882a44b-a9eb-4f45-8a5d-eefe23e96e35/Filmmaker.png',
      SQ+'b54308d9-69f7-4ab3-b060-d9397ff986ab/Staff-1.png',
      SQ+'8b55627b-8f1a-4ee4-9772-5e681878e590/Day%2BOne.png',
      SQ+'3cc49b17-07b2-4547-becc-51cdfa00b692/Screenwriter.png',
      SQ+'02df799e-e3f6-4fc0-b13c-7ad52241737b/Press.png',
      SQ+'4014a273-2cd4-4519-a95e-9aefc71a27ff/Weekend.png',
      SQ+'7fd2b65d-838d-48b3-863c-c11859c96f3b/Saturday.png',
      SQ+'4c242c39-c50b-4995-a381-49752b9185ed/Sunday.png',
      SQ+'a0f2781e-74b3-455f-9e8b-3a3893ed8d07/Dark%2BComedy.png',
      SQ+'fb543303-2ea6-4a6c-90a8-05936f9a8590/Horror.png',
      SQ+'ab761a12-26b7-4acd-8f60-8efd7a012f3f/Student%2BComedy.png',
      SQ+'1351ab79-d342-4a18-93b2-4a254165fc40/Spoof.png',
      SQ+'bdb6ebd5-517f-4fa8-9c3f-aedd3b74f732/Cringe%2B.png',
      SQ+'3c74e13c-c23a-4c73-90a0-ae4adfe2e9d4/Rom%2BCOm.png',
    ],
  },
  {
    slug: 'cannes',
    title: 'Cannes Film Festival 2023',
    details: 'Designer, Illustrator — Cannes, France — May 2023',
    body: ['Original artwork and invitation design for events at the 2023 Cannes Film Festival hosted by the Oscar-Qualifying HollyShorts Film Festival.'],
    images: [
      SQ+'f833ab5a-80e4-44e5-952c-8bd812a7df07/Cannes+Invite+Alt+4.png',
      SQ+'daf1e195-910d-4dc8-aa3e-4eed4466fd70/Cannes+Invite+Alt+4.png',
    ],
  },
  {
    slug: 'little-issues',
    title: 'LiTTLE iSSUES',
    details: 'Poster Designer — Dir. Jerah Milligan / Creator Jana Miley — Los Angeles, 2024',
    body: ['Winner of over a dozen awards.'],
    images: [SQ+'1716783754331-ALDPP3LMFBI7HP4U7XA1/Little+Issues+%5B2x3%5D.png'],
  },
  {
    slug: 'hallelujah',
    title: 'Hallelujah',
    details: 'Designer — Director Victor Gabriel — Executive Producer Spike Lee — Los Angeles, 2023',
    body: ['Graphic design for award campaign and social media for short film executive produced by Spike Lee.'],
    images: [
      SQ+'026e5f97-e3be-4c3f-9d4e-247d31f380cb/d36pfk07sshorts_Hallelujah_still1.jpg',
      SQ+'26860552-3b51-49cf-b916-222bd95d2552/Hallelujah+Screening+Square+Poster+1.png',
    ],
  },
  {
    slug: 'hsff18',
    title: '18th Annual HollyShorts Film Festival',
    details: 'Designer — TCL Chinese Theatres — Hollywood, August 2022',
    body: ['Graphic design and social media for the 18th Annual HollyShorts Film Festival.'],
    images: [
      SQ+'92472963-ef02-49bb-b91b-e9b3fed02fbd/Hollyshorts18.png',
      SQ+'a03e8d7b-fe51-4cc5-b489-fff190064466/5.png',
      SQ+'b7ef57cc-3807-4915-b137-413eda1dc814/6%2Bcopy.png',
      SQ+'ac3d1d0e-9422-4354-a379-b74594e28129/D3E8F9F0-AE46-4052-B1FB-AFAF48D065CF.jpg',
      SQ+'2c36a502-0d7b-4568-abca-9354ae626279/IMG_6421.jpeg',
      SQ+'c691ac2e-c139-4607-866d-94d52ef2bd02/IMG_6416.jpeg',
      SQ+'494af4ee-03df-4dcd-9c6b-54a12968d9a2/IMG_6402.jpeg',
      SQ+'433c7791-1c42-44e0-b924-2343da218b44/IMG_6408.jpeg',
      SQ+'bfe88321-ad0b-4374-a061-49fd4c7b79d1/HollyShorts%2BLaurel%2B2.png',
      SQ+'59f40564-aaec-4936-855c-5e85ba4d71bf/Hollyshorts18.png',
      SQ+'e027b839-d29b-483a-af86-57358acd5d46/F%2Bis%2Bfor%2BFilm%2BBlack.jpg',
      SQ+'5092859a-e518-4910-abc5-562cb00c3082/F%2Bis%2Bfor%2BFilm%2Bwhite.jpg',
    ],
  },
  {
    slug: 'hcsff6',
    title: '6th Annual Hollywood Comedy Shorts Film Festival',
    details: 'Lead Designer — TCL Chinese Theaters 6 — Hollywood, April 2022',
    body: ['Creative direction and graphic design for the 6th Annual Hollywood Comedy Shorts Film Festival. Work includes official award-show poster, festival badges, award design, laurel design, digital and print ad campaigns, social media strategy, event decor, and overall creative leadership.'],
    images: [
      SQ+'453d82a2-f892-4d9d-b963-7222f17efdae/img_0484_52043317890_o.jpg',
      SQ+'0babe82c-5525-4120-bac8-057658bcf4b6/img_0469_52042825331_o.jpg',
      SQ+'0ee6daa1-5b5e-4b83-bc55-e148e3031027/IMG_5787.jpeg',
      SQ+'20fd68ff-4597-45a9-b50a-430f63d88904/image1.jpeg',
      SQ+'0fdf7ca7-e168-4e4c-a3e7-94d2d4611046/image0.jpeg',
      SQ+'faf2c32f-8bf9-43ec-91b1-bcfe5f501142/All%2BAccess.jpg',
      SQ+'3d4ec5ef-d624-4017-b92b-bf5a447bcff6/Film%2BMaker.png',
      SQ+'7315ea19-6c4d-49cd-b9ec-32681c2a9880/Media.png',
      SQ+'c7a139c9-5a9e-4217-8bcc-ab3cf7c5da4f/Screenwriter%2Bbadges.jpg',
      SQ+'42b659af-62b9-4db9-bd5b-450523a19fc7/Flyer%2B6.png',
      SQ+'65f0c4a8-6040-422c-9ff1-0cdc223cbf65/Black%2BLaurel.png',
      SQ+'2f48d0ae-5309-46a8-b83a-db88fa62bfdb/Offocial%2BSelection%2BBlaxk.png',
      SQ+'a2eb2508-4a0e-4063-93e6-11e1f6fcde7a/Winner%2BBlack%2B.png',
      SQ+'57105a76-a331-48f7-8f8a-872f8088f530/Portait%2BPoster%2B5B.png',
      SQ+'97da5f90-a5d9-4367-9daa-9560b6ca8c83/Square%2BPoster%2B4%2BUpdated.png',
      SQ+'70b7053a-8d27-45dd-ac2c-99d4d4ccff1e/Story%2B4.png',
      SQ+'83aaa2e2-63c4-4a6a-b21e-bacf13d581d1/Story%2B5.png',
      SQ+'6f1dcf9a-16f4-452d-8d95-089b6088ba10/Portait%2BPoster%2B3.png',
      SQ+'54771d79-6735-4bce-b2a3-5ce9915d9125/Square%2BPoster%2B1%2BUpdated.png',
      SQ+'5292ea14-0f3f-4434-97aa-aead5675d0c7/Square%2BPoster%2B3%2BUpdated.png',
      SQ+'0837d106-8102-4759-ae0d-ef895af42a8a/Square%2Bposter%2B3B%2BUpdated.png',
    ],
  },
  {
    slug: 'chop-suey-club',
    title: 'Chop Suey Club',
    details: 'Assistant Designer — New York City, 2016',
    body: ['Chop Suey Club is a contemporary Manhattan-based gallery and design boutique focusing on Chinese artists. Original work includes web design, social media, content strategy, facilitating sponsorships, and organizing live events.'],
    images: [],
  },
];

// =====================================================
// GENERATE PROJECT PAGES
// =====================================================

for (const p of projects) {
  const html = projectPage(p);
  writeFileSync(`work/${p.slug}.html`, html);
  console.log(`  work/${p.slug}.html (${(p.images||[]).length} images)`);
}

// =====================================================
// GENERATE HS20 (special — has sections with 91 images)
// =====================================================
// Already included above but let me add the HS20 with all 91 images
const hs20 = {
  slug: 'hollyshorts20',
  title: '20th Annual HollyShorts Film Festival',
  details: 'Art Director — TCL Chinese Theatres, Egyptian Theater, Japan House — Los Angeles, 2024',
  body: ['Work includes official 20th anniversary poster, merch design, badge design, production design of the HollyShorts Film Festival, production design of the Alta Global Media Film Summit, production design of the 20th Annual HollyShorts Award Show live from the Egyptian Theater, and assisting on award design.'],
  images: [],
  sections: [
    { heading: 'Original art for the official 20th anniversary poster', images: [
      SQ+'bb7d9255-bee3-4937-b465-d6ff28b2ce24/%5BHS20%5D+Official+Poster+1.png',
    ]},
    { heading: 'Production Design of the 20th Annual HollyShorts Film Festival', sub: 'TCL Chinese Theatres — Los Angeles, CA — photo wall design, step-and-repeat and red carpet design, billboard design, on-screen graphics, event signage, lobby design', images: [
      SQ+'fe5c4ef7-2f6c-45e0-bfb4-24a2fd811f7f/%5BHS20%5D+Artwork+Wide.png',
      SQ+'1ff7ca32-30d1-4603-af3f-845f8b8db42e/IMG_4999.jpeg',
      SQ+'5cfeffa6-2c02-4f7d-b8ab-265ecefa3d4a/IMG_4997.jpeg',
      SQ+'a314fcc1-6dbe-42e8-8234-ef6cdd1fa5c0/%5BHS24%5D+Lobby+sketch.png',
      SQ+'04ea546b-829c-4a9e-9656-7de615c02112/IMG_5145.JPG',
      SQ+'eb4c94bb-6b69-43ec-843a-21e1eea0bac3/74483311620__BC4EEE69-6BA7-4121-8741-C992E5453FEF.jpeg',
      SQ+'1dcbdcd5-2a49-43f8-9391-231425fb434c/53911715166_badc84a47e_k.jpg',
      SQ+'d553af31-7db8-4b45-9dca-6aeddad91d5c/53911435472_a5b3325094_k.jpg',
      SQ+'77460279-d6e1-43fd-9ff2-c6e7756781f4/IMG_4932.jpeg',
      SQ+'6d1f433c-3ffd-4d91-9d7d-f1a170e080c5/IMG_4886.jpeg',
      SQ+'66f5a8e1-8ba1-4a14-b85a-eba7dfad01af/IMG_5052.jpeg',
      SQ+'84559d98-39bd-44ea-b2de-13e973442d69/IMG_4864.jpeg',
      SQ+'6cbbd84d-b967-415d-8c13-ec21c147851e/IMG_0788.jpeg',
      SQ+'212377fa-9f0c-4119-9f3d-e440b9be6bb2/IMG_4957.jpeg',
      SQ+'e8c982eb-9cbc-41d5-a8cb-673061701f76/IMG_4942.jpeg',
      SQ+'51333411-ed1c-4712-ae4a-9e49acf1cce7/IMG_4881.jpeg',
      SQ+'6ccddd30-ecbf-47d6-b5e5-ae1ecdc33f04/53911433742_80e1e38baf_k.jpg',
      SQ+'a5feb733-89e8-4658-bb8f-7025d04dfae7/53916607930_407fea7609_k.jpg',
    ]},
    { heading: 'Production Design of the 20th Annual HollyShorts Award Show', sub: 'Egyptian Theater — Los Angeles, CA — on-screen graphics, photo wall and step-and-repeat, digital billboard designs, the HollyShorts Revello award', images: [
      SQ+'592ea0fa-48ba-4353-807f-8e103808d170/53931937742_326bfa634b_k+copy.jpg',
      SQ+'6147acb0-c3a8-4dd4-bfee-7ed227e492b7/53931994012_0b6c71307c_k.jpg',
      SQ+'92ed0199-297f-45f9-82c0-fe9784a7b2a5/53932803601_fe959fae92_h.jpg',
      SQ+'1b090846-c471-4038-b21a-1c4934c524b7/53932940741_61009658f2_k.jpg',
      SQ+'a8449f9c-8ad2-4b1d-9be7-f1dcfc3ea61b/53934682633_2c7e79b74d_k.jpg',
      SQ+'d4189664-d713-47db-be38-534e0b51caf1/53932754656_7db7a6a5db_k.jpg',
      SQ+'88ed0b2e-7e4b-4329-842b-0c4db9b9186c/53935572245_f0c052e090_h.jpg',
      SQ+'76224c09-3656-4734-94ce-71f200187a8a/53933521112_0d53b3abeb_k.jpg',
      SQ+'a34a7e51-e154-4b3d-951d-040c87197e6d/IMG_5370.jpeg',
      SQ+'d40b7da5-a092-45da-b8df-fa52741a2ea1/53934219632_86ab601705_h.jpg',
      SQ+'3ae3197e-92e5-4ae2-9b6f-1196546b651a/53934219812_3084f0ee14_h.jpg',
      SQ+'257fca22-fe2c-4679-bf76-13ef9790ba2b/53934425866_cea1490471_o.jpg',
      SQ+'f5063c3a-928e-47ba-83d8-9e520a743d6e/IMG_5345.jpeg',
      SQ+'ce25f369-1b29-49ea-9c0b-235c19f05ec5/53934759259_9f908ea75d_o.jpg',
      SQ+'fac6b163-27d6-4505-a876-d5ce8cac8c18/53933525622_2f2ed7254f_k.jpg',
      SQ+'66ee6192-a15a-4f11-a35f-74c511d8c157/53934666648_e46ee57a9c_o.jpg',
      SQ+'00a8e67f-738e-4e07-a6ff-8011a304b146/53932703281_78167f18ff_k.jpg',
      SQ+'b32d2a0c-590f-4586-b640-2afd941554be/IMG_5365.jpeg',
      SQ+'564f5cb2-4461-4f9f-92ed-2776518c0271/53934756624_a6f1e28362_o.jpg',
      SQ+'0b7ba1f7-6f3b-4905-8502-38acc7dc4daf/IMG_5353.jpeg',
      SQ+'006ca5e6-c9f9-4338-94ce-3f081fabccce/IMG_5361.jpeg',
      SQ+'76db70e4-3004-415e-a527-3f2b94dffb67/Picture.jpeg',
    ]},
    { heading: 'Merch Designs', images: [
      SQ+'18692ffd-29bc-4645-b0cf-f57bff1f7f1d/All+merch.png',
      SQ+'253c76da-c69e-4885-a05b-e50b4fe9f1c9/Hoodie+model+front.png',
      SQ+'f3a08154-e616-41c4-b5ca-001e054372fa/hoodie+model+back.png',
      SQ+'647cecaf-1073-4092-9dd1-ed57741a9060/Poster.png',
      SQ+'7ec1ff51-7054-4b72-a9d9-158b513d929d/Front+01.png',
      SQ+'ef387794-c92a-4e0e-9058-c9454fc86b47/White+shirt+mock+up.png',
      SQ+'259a9d08-681d-4b30-9b55-78543ce841a2/Black+Shirt+mock+up.png',
      SQ+'38b79293-7d1b-4713-9c70-9ef1991bc901/Blue+shirt+mock+up.png',
      SQ+'1cda462e-a664-46f0-806f-2fd7c4f36221/hat.png',
      SQ+'b28e1b1f-4a97-45c6-b381-5e299dd2ab9a/Tote.png',
    ]},
    { heading: 'Badge Designs', images: [
      SQ+'0eda16cf-04e8-425b-9488-a4a284308ce5/IMG_4875.jpeg',
      SQ+'d1e951a3-9bd5-486d-875d-0af86574fa96/53922590294_f66a2a4eb1_h.jpg',
      SQ+'9ad8f6a3-d411-44d3-bae1-4773c56d515a/IMG_4973.jpeg',
      SQ+'1e19cf14-4cef-4053-ab45-720a82dec324/1.png',
      SQ+'ce4e82a5-d07f-4780-a870-3704f760b744/2.png',
      SQ+'7fffea6a-cacf-42b0-a630-3b23b676ea16/9.png',
      SQ+'9568275c-9410-4ec9-b0ee-8f33312cf1b5/5.png',
      SQ+'e0fdc955-e6eb-4b70-98ed-fff6c6a82f31/4.png',
      SQ+'6a966f7b-6984-4af4-a3ba-abf33ae9d772/3.png',
      SQ+'d6d0b352-efdd-46c0-8f99-418232cd55fb/6.png',
      SQ+'3aee3e86-be29-4247-b9a4-c3a7dd806d1c/8.png',
      SQ+'d61fff4c-83e2-4b1f-97ab-5dd2fa5e6312/7.png',
      SQ+'515e2ee8-a19e-47a9-93ca-3de1de529f43/10.png',
    ]},
    { heading: 'Award Design', images: [
      SQ+'0d11535e-f0f2-4856-aa2c-48b050ee9673/53912156200_960d4c1e25_k.jpg',
      SQ+'1246b9b8-712e-4230-8a21-e37bb7b8f70a/53911963313_6991ef07e2_k.jpg',
      SQ+'752cd535-a06a-428d-a1e1-94c644d1c454/Group+9.png',
      SQ+'3342b5d5-d6eb-438b-b905-5395856ede2e/Placcard+one.png',
      SQ+'6b1012f8-93be-4be8-abe5-d29862323641/Group+8.png',
      SQ+'324ba807-b512-44dd-911a-4fe5cbaaab92/Group+7.png',
    ]},
    { heading: 'Original art', images: [
      SQ+'00ecdae1-efb9-41a7-964a-6a31daebc626/IMG_5361.jpeg',
      SQ+'e4461385-8d36-406f-801a-1f11978fd07f/53934756624_a6f1e28362_o.jpg',
      SQ+'44127583-7016-4ac0-bf2e-73bed9cad880/53933540187_7629917034_k.jpg',
      SQ+'cccd147b-3563-4ba4-aed3-b41b1550889e/53934896690_7925c64d38_k.jpg',
      SQ+'57e72567-96d3-4a00-8a64-3f10d21e144d/53932050987_10ace6f15a_k.jpg',
      SQ+'d968ea36-855a-44eb-a724-7de7a98fd977/Screenshot+2024-09-10+at+3.44.05%E2%80%AFPM.png',
      SQ+'ae7ee889-1cba-4036-a832-000f5f324820/4.png',
      SQ+'adb8b04e-6f0d-4f36-a9be-7def2c07f698/Screenshot+2024-08-15+at+9.38.27%E2%80%AFPM.png',
      SQ+'2491e28c-a0fc-4b57-aebf-748f37c7ab0e/Screenshot+2024-08-15+at+9.44.58%E2%80%AFPM.png',
      SQ+'8f10ca7e-9510-4f94-8083-acb1a102535f/Screenshot+2024-08-15+at+9.38.35%E2%80%AFPM.png',
      SQ+'71fbb0ce-3cb6-46e9-82da-b9bc64a4df86/Screenshot+2024-08-11+at+3.28.49%E2%80%AFPM.png',
      SQ+'d33f1637-ab90-4cd7-8203-4eb9311dda26/2.png',
      SQ+'c1a79838-d437-456f-9d2f-79f8343aa331/Screenshot+2024-08-11+at+3.26.57%E2%80%AFPM.png',
      SQ+'ce7d0837-48f1-4f09-91e5-b0dba63048f7/Screenshot+2024-08-11+at+3.26.50%E2%80%AFPM.png',
      SQ+'89a53238-df34-402c-ba1b-18c33fe08974/Screenshot+2024-08-11+at+3.32.28%E2%80%AFPM.png',
      SQ+'35c97bb2-d4b3-4c22-88bd-bef457b5a936/IMG_5243.jpeg',
      SQ+'a284ded2-c12e-42b4-8756-4ce960ec2a7a/Screenshot+2024-08-15+at+9.38.20%E2%80%AFPM.png',
      SQ+'3f0543ca-e6ae-40ca-a62a-607b1ef465b4/Screenshot+2024-08-15+at+9.38.11%E2%80%AFPM.png',
      SQ+'965ddb9a-22ef-467e-82c4-716a37ed598d/Screenshot+2024-08-15+at+9.38.02%E2%80%AFPM.png',
      SQ+'7d43f63e-c7b0-40fd-9a04-cf8381f3b0c6/IMG_5160.jpeg',
      SQ+'2cf8b1e9-f804-4760-bad5-e7829fb25fdd/Screenshot+2024-08-11+at+3.33.15%E2%80%AFPM.png',
    ]},
  ],
};
writeFileSync(`work/hollyshorts20.html`, projectPage(hs20));
console.log(`  work/hollyshorts20.html (${hs20.images.length} images)`);

// =====================================================
// ABOUT + PRESS combined page
// =====================================================
const aboutHtml = `
      <div class="about-layout">
      <div class="about-left">
      <div class="about-bio">
        <h1>About</h1>
        <p>Dalton Corr is a musician and designer based in New York City and Los Angeles. His music and visual art has received international recognition through live performances, festivals, and album releases in North America, Europe, and Asia. Collaborators include the Oscar-qualifying HollyShorts Film Festival, Grammy-winners David and Norman Chesky, and New York University\u2019s Village Records.</p>
        <p>Dalton\u2019s music includes feature-length film scores, original studio albums, and international live performances. He is the founder of the music production house, Espresso Tempo.</p>
        <p>Dalton\u2019s design work includes art direction for the Oscar-qualifying HollyShorts Film Festival, art direction for HollyShorts London, artwork for the 2023 Cannes Film Festival, theatrical movie poster designs, artwork for the Grammy Award-winning Chesky Records, and design for Manhattan art gallery, Chop Suey Club.</p>
      </div>

      <div class="about-contact">
        <h3>Contact</h3>
        <div class="about-contact-list">
          <a href="mailto:daltoncorr@gmail.com">daltoncorr@gmail.com</a>
          <a href="https://instagram.com/daltoncorr" target="_blank" rel="noopener">Instagram</a>
          <a href="https://www.imdb.com/name/nm8515438/" target="_blank" rel="noopener">IMDb</a>
        </div>
      </div>
      </div>

      <div class="about-right">
      <div class="press-section">
        <h2>Press</h2>

        <h3 class="press-year">2024</h3>
        <div class="press-entry"><a href="https://variety.com/2024/film/global/george-r-r-martin-short-the-ugly-chickens-felicia-day-premiere-hollyshorts-1236098401/" target="_blank" rel="noopener">Variety \u2014 HollyShorts Film Festival 2024</a></div>
        <div class="press-entry"><a href="https://deadline.com/2024/07/hollyshorts-film-festival-2024-jurors-1236016173/" target="_blank" rel="noopener">Deadline \u2014 HollyShorts 20th Anniversary</a></div>
        <div class="press-entry"><a href="https://www.dailymail.co.uk/tvshowbiz/article-13726497/Bella-Thorne-suit-yellow-HollyShorts-Film-Festival.html" target="_blank" rel="noopener">Daily Mail \u2014 HollyShorts 20th Coverage</a></div>
        <div class="press-entry"><a href="http://www.festivalinla.com" target="_blank" rel="noopener">FestivalsInLA \u2014 \u201CWorld\u2019s Greatest Film Festival Posters 2024\u201D</a></div>
        <div class="press-entry"><a href="https://canvasrebel.com/meet-dalton-corr/" target="_blank" rel="noopener">Canvas Rebel \u2014 \u201CMeet Dalton Corr\u201D</a></div>
        <div class="press-entry"><a href="https://www.awardsdaily.com/2024/08/shorts-exclusive-hollyshorts-announces-nominees/" target="_blank" rel="noopener">AwardsDaily \u2014 HollyShorts Coverage</a></div>
        <div class="press-entry"><a href="https://www.timeout.com/los-angeles/things-to-do/hollyshorts-film-festival" target="_blank" rel="noopener">TimeOut \u2014 HollyShorts 2024</a></div>
        <div class="press-entry"><a href="https://www.moviemaker.com/50-film-festival-worth-entry-fee-2024/" target="_blank" rel="noopener">MovieMaker \u2014 Top 50 Film Festivals</a></div>

        <h3 class="press-year">2023</h3>
        <div class="press-entry"><a href="https://deadline.com/2024/07/hollyshorts-film-festival-2024-jurors-1236016173/" target="_blank" rel="noopener">Deadline \u2014 HollyShorts Film Festival 2023</a></div>
        <div class="press-entry"><a href="https://variety.com/2024/film/global/george-r-r-martin-short-the-ugly-chickens-felicia-day-premiere-hollyshorts-1236098401/" target="_blank" rel="noopener">Variety \u2014 HollyShorts 19th Coverage</a></div>
        <div class="press-entry"><a href="http://www.festivalinla.com/2023/11/the-worlds-best-film-festival-posters.html" target="_blank" rel="noopener">FestivalsInLA \u2014 \u201CWorld\u2019s Greatest Film Festival Posters 2023\u201D</a></div>
        <div class="press-entry"><a href="https://radioducinema.com/podcasts/rencontre-avec-dalton-corr-musicien-et-designer-au-hollyshorts-film-festival-235" target="_blank" rel="noopener">Radio du Cin\u00e9ma \u2014 Podcast Interview</a></div>
        <div class="press-entry"><a href="https://laist.com/news/arts-and-entertainment/best-events-things-to-do-this-week-los-angeles-southern-california-april-21-23-2023" target="_blank" rel="noopener">LAist \u2014 \u201CThings To Do This Week\u201D</a></div>

        <h3 class="press-year">2022</h3>
        <div class="press-entry"><a href="https://1stdayfresh.com/2022/12/06/dalton-corr-remixes-b-bravos-no-regrets/" target="_blank" rel="noopener">Darian Burns / 1st Day Fresh \u2014 No Regrets Remix</a></div>
        <div class="press-entry"><a href="https://dopehiphop.net/dalton-corrs-no-regrets-takes-center-stage-b-bravos-vizionz-remixes/" target="_blank" rel="noopener">Dope Hip Hop \u2014 No Regrets Remix</a></div>
        <div class="press-entry"><a href="https://www.broadwayworld.com/los-angeles/article/Cevin-Solings-TIFFANY-BRITTANY-To-Screen-At-The-Hollywood-Comedy-Short-Film-Festival-In-LA-And-NYC-April-30-20220419" target="_blank" rel="noopener">Broadway World \u2014 Comedy Shorts</a></div>
        <div class="press-entry"><a href="https://www.richgirlnetwork.tv/2022/04/hollywood-comedy-shorts-fest-is-back-april-28th-30th/" target="_blank" rel="noopener">RichGirl Network TV \u2014 Comedy Shorts</a></div>

        <h3 class="press-year">2019</h3>
        <div class="press-entry"><a href="https://www.nowness.com/story/boys-will-be-flowers-daddy-ramazani" target="_blank" rel="noopener">NOWNESS \u2014 Boys Will Be Flowers</a></div>
        <div class="press-entry"><a href="https://lefifa.com/en/catalog/boys-will-be-flowers" target="_blank" rel="noopener">Le Festival International du Film sur l\u2019Art \u2014 Official Selection</a></div>

        <h3 class="press-year">2017</h3>
        <div class="press-entry"><a href="https://issuu.com/nyu.news/docs/wsn20170327/8" target="_blank" rel="noopener">Washington Square News \u2014 Print Interview</a></div>
        <div class="press-entry"><a href="https://nyunews.com/2017/04/11/steinhardt-senior-talks-music-and-lyrics/" target="_blank" rel="noopener">Washington Square News \u2014 Online Interview</a></div>
        <div class="press-entry"><a href="https://nyunews.com/2017/04/25/i-think-of-you-feels-as-salty-sweet-as-summer/" target="_blank" rel="noopener">Gilchrist Green \u2014 I Think Of You Review</a></div>

        <h3 class="press-year">2015</h3>
        <div class="press-entry"><a href="http://www.etmusiquepourtous.com/2015/11/29/d-corr-radio-cafe/" target="_blank" rel="noopener">Et musique pour tous \u2014 After The Show EP Review</a></div>
        <div class="press-entry"><a href="https://noonpacific.com/singles/single-028" target="_blank" rel="noopener">Noon Pacific \u2014 Feature</a></div>
      </div>
      </div>
      </div>`;

writeFileSync('about.html', page('About — Dalton Corr', 'About', '', aboutHtml));
console.log('  about.html');

// Remove press.html — about has it now
writeFileSync('press.html', `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=about.html"></head><body></body></html>`);
console.log('  press.html (redirect to about)');

// ── Blog ──────────────────────────────────────────────────────

const blogPosts = [
  {
    slug: 'venice-food-tramps',
    title: 'The Venice Food Tramps',
    date: 'March 20, 2026',
    tags: ['venice', 'photography'],
    image: 'images/VFT_Storefront_5560.jpg.webp',
    body: [
      'Before Venice Beach became synonymous with luxury condos and tech money, it was a place where community meant something different — something scrappier, more immediate. The Venice Food Tramps store was one of those rare gathering points where neighbors actually knew each other, where the line between customer and friend dissolved entirely.',
      'The storefront, with its hand-painted PRODUCE sign and macramé curtains, was as much a social hub as it was a place to buy papayas at 45 cents a piece. People would sit out front for hours — MaiBritt, Larry, Michael, Cole, whoever happened to be around — talking, watching the boardwalk go by. The store operated on trust and goodwill, a cooperative spirit that feels almost radical by today\'s standards.',
      'Venice in the mid-seventies was a strange, in-between place. The canals were still half-abandoned, full of ducks and squatters. The boardwalk hadn\'t yet been colonized by muscle gyms and souvenir shops. Rent was cheap enough that artists and musicians and people who simply refused to live any other way could hold on. The Food Tramps existed inside that window — a cooperative grocery that was less a business than a social contract.',
      'Jerry and MM in the kitchen, unpacking groceries with the kind of quiet focus that suggests routine — this wasn\'t a special occasion, it was just Tuesday. The straw hat, the plants in the background, the cluttered counter. Nothing is staged. Nothing is optimized for anyone\'s gaze. That\'s what makes these images feel almost sacred now: they\'re documents of people who weren\'t trying to be documented.',
      'There\'s a theory that every neighborhood has a soul, and that the soul lives in a specific place — a bar, a barbershop, a corner store. For Venice in the seventies, one of those places was this storefront. You can see it in the body language of the people sitting outside: the lean, the sprawl, the unselfconscious ease of people who belong somewhere.',
      'What happened to Venice after this is a story that\'s been told a thousand times — gentrification, displacement, the slow erasure of a culture by money. But these photographs don\'t tell that story. They tell the story before the story. They show you what was there before anyone realized it could be lost.',
    ],
    images: [
      'images/VFT_Storefront_5560.jpg.webp',
      'images/In front of the Venice Food Tramps store. L to R- MaiBritt, Larry, Michael and Cole. .jpg',
      'images/MM-and-Jerry-at-VFT-ca.-1976.jpg.webp',
    ],
  },
  {
    slug: 'line-and-gesture',
    title: 'Line and Gesture: Picasso, Matisse, and the Art of Simplicity',
    date: 'March 15, 2026',
    tags: ['art', 'design'],
    image: 'images/515939_1.jpg',
    body: [
      'There\'s a particular kind of confidence in a line drawing — a single, continuous stroke that captures a face, a feeling, an entire relationship. Picasso and Matisse both understood this. Their line work wasn\'t simple because they couldn\'t do more; it was simple because they\'d already done everything else and arrived back at the essential.',
      'Picasso\'s 1955 drawing of two women with a dove is a masterclass in economy. Every curve serves double duty — defining a jawline while suggesting tenderness, outlining a hand while conveying gentleness. The dove between them isn\'t just a symbol; it\'s the compositional anchor that gives the whole piece its sense of peace. Dated in his own hand: 31.10.55. He was 74 years old and still drawing like he had something to prove to himself.',
      'There\'s a mystical dimension to the single-line portrait that rarely gets discussed. The unbroken line is one of the oldest symbols in human mark-making — it appears in Aboriginal songlines, in Zen ensō circles, in the continuous knots of Celtic manuscripts. To draw a face without lifting the pen is, in some sense, to cast a spell: to bind the essence of a person into a single, unbroken gesture.',
      'Matisse\'s ink portraits operate on a similar principle but with a different energy. Where Picasso\'s line is deliberate and architectural, Matisse\'s is fluid, almost calligraphic. His brush seems to dance across the paper, finding the face through movement rather than construction. He called it "drawing with scissors" when he moved to cut-outs, but even his ink work has that quality — of removing everything that isn\'t the thing.',
      'The Pour Roby portrait — Picasso\'s simple line drawing of a young face — is almost unbearably tender. A few curves for hair, two quick eyes, the suggestion of a collar. It shouldn\'t work. There isn\'t enough information. But the brain fills in what the hand left out, and somehow what the brain provides is more specific, more alive, than any amount of rendered detail could be.',
      'What both artists understood — and what contemporary design often forgets — is that reduction isn\'t the same as minimalism. You can\'t arrive at a powerful line drawing by simply removing things. You have to know what to keep. That knowledge comes from years of drawing everything, of understanding anatomy and light and weight, and then choosing to set all of that aside in favor of a single, trembling, perfect line.',
      'I keep these reproductions around my studio not as decoration but as discipline. Every time I\'m tempted to add one more gradient, one more layer, one more flourish to a design, I look at that Picasso dove and remember: the most sophisticated thing you can do is stop.',
    ],
    images: [
      'images/515939_1.jpg',
      'images/e627001e7e09adc505b1afdcaba9d524.jpg',
      'images/images.jpg',
    ],
  },
  {
    slug: 'color-as-landscape',
    title: 'Color as Landscape',
    date: 'March 8, 2026',
    tags: ['art', 'printmaking'],
    image: 'images/00a0a_it0V64sbO2y_0fu0b6_600x450.jpg',
    body: [
      'There\'s a particular quality to landscape prints where the color does the heavy lifting — where mountains aren\'t drawn so much as they\'re felt through layers of purple and orange. The screenprint tradition has always had this capacity: to flatten depth into something decorative and, in doing so, to reveal an emotional truth about place that realism can\'t touch.',
      'This print, with its vivid orange sky bleeding into purple peaks and a turquoise-green foreground, doesn\'t depict a specific place. It depicts the feeling of a specific place — that moment at sunset when colors become unreasonable, when the landscape briefly looks like it was designed by someone with better taste than nature usually has. The printmaker understood something that photographers spend their whole lives chasing: the way light transforms geography into emotion.',
      'Screenprinting is an alchemical process in the most literal sense. You\'re working with mineral pigments, forcing them through mesh with a squeegee, layering translucent veils of color one on top of another. Each pass through the press is an act of faith — you can\'t see the final image until all the layers are down. The print exists first as an idea, then as a sequence of discrete color separations, and only finally as the unified image. It\'s creation through accumulation, through patience, through trust in a process you can\'t fully control.',
      'The collage-like quality of the cutout print — silhouetted profiles against a bright yellow ground, signed by Yves — operates on the same principle. Color isn\'t describing; it\'s constructing. The yellow isn\'t a background; it\'s an atmosphere. The green isn\'t a shadow; it\'s a presence. The white profile and the green profile exist in the same space but different dimensions, like two versions of the same person separated by mood or memory.',
      'I think about this a lot when choosing palettes for design work. The temptation is always to use color referentially — blue for sky, green for nature, red for danger. But the best colorists use it architecturally. Josef Albers spent decades proving that a single color changes meaning depending on what\'s next to it. A purple mountain against an orange sky isn\'t purple and orange. It\'s twilight. It\'s distance. It\'s the specific loneliness of watching the sun go down somewhere you\'ve never been.',
      'These works remind me that the best design often works the same way. The color palette isn\'t decoration — it\'s the architecture. Get it right and the viewer feels something before they understand anything.',
    ],
    images: [
      'images/00a0a_it0V64sbO2y_0fu0b6_600x450.jpg',
      'images/Screenshot 2025-03-16 at 3.39.33 PM.png',
    ],
  },
  {
    slug: 'this-was-the-dream',
    title: 'This Was the Dream',
    date: 'February 28, 2026',
    tags: ['art', 'magic'],
    image: 'images/Dreamcatcher1.jpg',
    body: [
      'Three birds in flight, drawn with the kind of loose, urgent brushwork that suggests they might fly off the fabric entirely. Below them, in mismatched letterpress colors: THIS WAS THE DREAM. Past tense. The phrase sits there like a quiet gut-punch.',
      'Textile art has always carried a different weight than work on paper or canvas. There\'s something about cloth — its softness, its domesticity, its association with comfort and shelter — that makes confrontational text land differently. When you embroider or print words onto fabric, you\'re embedding them into something intimate. The medium resists irony. It insists on sincerity.',
      'The birds themselves are beautiful in their imprecision. They\'re not ornithological illustrations; they\'re gestures of flight, of escape, of aspiration. Each one is slightly different, as if caught at different moments in the same upward spiral. The brushstrokes are fast and feathered — the artist\'s hand moving in the same rhythm as the wings they\'re depicting. There\'s a mimetic sympathy there that you can feel.',
      'In many folk traditions, birds are psychopomps — guides between worlds. They carry messages between the living and the dead, between the waking world and the dream world. To put three birds on fabric and caption them with a past-tense invocation of dreaming is to create something that functions almost as a talisman. This isn\'t just art. It\'s a spell that\'s already been cast.',
      'The color of the text matters: THIS in blue, WAS in what looks like a faded red, THE in blue again, DREAM with letters shifting from blue to pink. The inconsistency reads as hand-set type, each letter chosen individually, each one slightly misaligned. It gives the phrase a stuttering, halting quality — like someone saying it slowly, weighing each word.',
      'Was the dream the birds? The flight? The freedom? Or was the dream something else entirely — something the artist has already let go of, preserved here in ink and thread as a kind of memorial? The past tense does all the work. This WAS the dream. And now? Now it\'s a piece of fabric hanging in a room, and somehow that\'s enough.',
    ],
    images: [
      'images/Dreamcatcher1.jpg',
      'images/dreamcatcher2.jpg',
    ],
  },
  {
    slug: 'rooftop-color',
    title: 'Rooftop Color: Fashion and Place',
    date: 'February 20, 2026',
    tags: ['photography', 'design'],
    image: 'images/Kantamanto-Market-1024x1024.jpg',
    body: [
      'There\'s a particular kind of portrait where the environment and the subject become inseparable — where you couldn\'t extract the person from the setting without losing the entire point. This rooftop image, with its spread of drying clothes in blues and browns and one figure in electric orange at the center, is exactly that kind of photograph.',
      'The composition is deceptively casual. The clothes laid out to dry create a grid of muted color that makes the orange jacket vibrate. The blue barrel, the concrete, the stacked pallets — everything is arranged by life rather than art direction, and it works better for it. No stylist could have placed those jeans at exactly that angle. No set designer would have thought to include the water container. Reality is always a better art director than art directors.',
      'This is Kantamanto, Accra\'s secondhand clothing market — one of the largest in the world. Every week, bales of discarded Western clothing arrive in shipping containers, are sorted, priced, and resold. The clothes drying on this rooftop are inventory, not laundry. They\'re being prepared for sale. The entire image is, in one sense, a picture of global economics — the long, strange journey of a pair of jeans from a closet in Ohio to a rooftop in Ghana.',
      'But that reading misses what makes the photograph actually work: the color. The orange is almost violent against the blues and grays. It\'s the only warm tone in the frame, and the figure wearing it sits dead center, legs folded, gaze direct. She\'s not modeling. She\'s not posing. She\'s just there, and the orange is just orange, and together they\'re unforgettable.',
      'What makes a great fashion image isn\'t the clothes. It\'s the relationship between the person, what they\'re wearing, and where they are. When all three click, you get something that transcends documentation and becomes atmosphere. The best editorial photographers — Juergen Teller, Tyler Mitchell, Viviane Sassen — understand this instinctively. The location isn\'t a backdrop. It\'s a collaborator.',
      'The figure\'s posture — seated, arms wrapped around knees, direct gaze — communicates a stillness that contrasts with the labor implied by the drying clothes around her. She\'s not working; she\'s present. The white sneakers are immaculate against the concrete. The sunglasses pushed up on her head catch light. Every detail is right because none of it was planned. The orange isn\'t just a color choice; against this particular rooftop, it\'s a declaration.',
    ],
    images: [
      'images/Kantamanto-Market-1024x1024.jpg',
      'images/00L0L_13tZ8VWZmLk_0go0t2_1200x900.jpg',
    ],
  },
  {
    slug: 'sigils-in-the-grid',
    title: 'Sigils in the Grid: The Occult Life of Graphic Design',
    date: 'March 24, 2026',
    tags: ['magic', 'design'],
    image: 'images/515939_1.jpg',
    body: [
      'A sigil is a symbol charged with intention. You draw it, you focus on it, you forget it — and it works in the background of your mind like a process running in the dark. Now tell me that doesn\'t sound exactly like a logo.',
      'Austin Osman Spare figured this out in the 1910s. He was making chaos magic while the Bauhaus was making grid systems, and neither side realized they were doing the same thing. Spare would condense a sentence of desire into a single abstract mark. Paul Rand would condense a corporation\'s entire identity into a single abstract mark. The method is identical. The client list is different.',
      'Picasso understood this intuitively. His line drawings — the dove, the bull, the face reduced to six strokes — aren\'t simplifications. They\'re distillations. He drew the bull forty times until only the essential remained. That\'s not minimalism. That\'s banishing ritual. You remove everything that isn\'t the thing until only the thing is left.',
      'Think about the symbols that actually live in your head. The Nike swoosh. The peace sign. The ankh. They work because they bypass language entirely and hit something older. Gerald Holtom designed the peace sign in 1958 using semaphore positions for N and D — nuclear disarmament — but nobody remembers that. The symbol outgrew its origin story. That\'s what a charged sigil does.',
      'Every brief that lands on your desk is secretly asking for magic. The client says they want a "clean, modern mark." What they actually want is a symbol that makes strangers trust them on sight. That\'s not design. That\'s enchantment. The sooner you treat it that way, the better your work gets.',
      'The grid is the ritual space. The negative space is the silence between the incantation. The final mark is the sigil. You\'ve been practicing magic this whole time. You just called it "branding."',
    ],
    images: ['images/515939_1.jpg'],
  },
  {
    slug: 'venice-as-sacred-ground',
    title: 'Venice as Sacred Ground',
    date: 'March 17, 2026',
    tags: ['venice', 'magic'],
    image: 'images/VFT_Storefront_5560.jpg.webp',
    body: [
      'In 1905 Abbot Kinney dredged a salt marsh south of Santa Monica and built a replica of Venice, Italy — colonnades, gondolas, the whole production. He wanted culture. He got something weirder and more honest. The canals silted up. The gondoliers quit. The grand vision decayed into something more interesting than any plan could produce.',
      'That\'s the Tao of Venice right there. You build the structure, then you let the water do what it wants. Every sacred space works this way. Delphi was a crack in the earth that released fumes. Varanasi is a riverbank where people go to die. Venice Beach is a three-mile stretch of concrete and sand where the whole American experiment washes up and dries in the sun.',
      'The Food Tramps knew this in the seventies. That produce stand on the boardwalk wasn\'t just a store — it was a node. People came for the avocados and stayed for the conversation. Larry and MaiBritt and the rest of them turned a storefront into a living room. That\'s what sacred spaces actually do. They don\'t perform holiness. They just hold the door open long enough for something real to walk in.',
      'The boardwalk is still like this. Muscle Beach next to a drum circle next to a man selling conspiracy pamphlets next to a kid doing the most beautiful thing you\'ve ever seen on a skateboard. No curation. No programming. Just proximity and permission. The Greeks had a word for this kind of space — temenos. A cut in the ordinary world where different rules apply.',
      'You don\'t design sacred space. You recognize it. You protect it. And when a landlord tries to turn it into a juice bar, you understand that the fight over a storefront lease is the same fight humans have been having over holy ground for ten thousand years.',
      'Venice is sacred because it refuses to be anything consistently. It\'s the patron saint of refusing to hold still.',
    ],
    images: ['images/VFT_Storefront_5560.jpg.webp', 'images/In front of the Venice Food Tramps store. L to R- MaiBritt, Larry, Michael and Cole. .jpg'],
  },
  {
    slug: 'dada-as-spell-casting',
    title: 'Dada as Spell-Casting',
    date: 'March 10, 2026',
    tags: ['magic', 'art'],
    image: 'images/Screenshot 2025-02-06 at 2.26.50 PM.png',
    body: [
      'Zurich, 1916. Europe is feeding its children into machine guns. Hugo Ball puts on a costume made of cardboard tubes and a witch-doctor hat and recites sound poetry — "gadji beri bimba glandridi laula lonni cadori" — until he has to be carried off stage. He later wrote that he felt like he\'d become a "magical bishop." He wasn\'t being poetic. He meant it.',
      'Dada wasn\'t an art movement. It was a séance. Tristan Tzara pulled words out of a hat to make poems. Hans Arp dropped torn paper and glued it where it fell. They were using chance as a collaborator, which is exactly what divination is — you create a system, you introduce randomness, and you read the result as if it means something. It does.',
      'Look at Picabia\'s magazine covers. Letters smashed together, sizes and weights clashing, the whole grid system of Western typography thrown into a blender. This isn\'t chaos for its own sake. It\'s a deliberate breaking of the spell that says information must be orderly to be true. Sometimes the most honest thing a page can do is scream.',
      'Every designer who\'s ever kerned a word by feel instead of by number is channeling this. Every time you break the grid because something "feels right" — that\'s Dada. That\'s divination. You\'re reading the entrails of your own layout and trusting what you see.',
      'The Dadaists understood something that most design education still won\'t say out loud: reason is one tool among many, and it\'s not always the sharpest one in the drawer. Sometimes you need to speak in tongues for a minute to find out what you actually mean.',
      'Tzara\'s recipe for a Dada poem — cut up a newspaper, shake the pieces in a bag, pull them out one by one — is also a perfectly valid method for breaking through a creative block in 2026. The tool doesn\'t expire. The bag is always there.',
    ],
    images: ['images/Screenshot 2025-02-06 at 2.26.50 PM.png'],
  },
  {
    slug: 'color-theory-as-divination',
    title: 'Color Theory as Divination',
    date: 'March 3, 2026',
    tags: ['magic', 'design'],
    image: 'images/00a0a_it0V64sbO2y_0fu0b6_600x450.jpg',
    body: [
      'Before Newton split light through a prism and declared the spectrum a matter of physics, people treated color as alive. The Egyptians ground malachite for green and believed the pigment carried the power of new growth. Tyrian purple cost more than gold because it came from the mucus of sea snails — twelve thousand snails for one gram of dye. You don\'t spend that kind of effort on decoration. You spend it on magic.',
      'Goethe published his Theory of Colours in 1810 and the scientists laughed at him. He wasn\'t interested in wavelengths. He wanted to know why yellow feels warm and blue feels infinite. He was mapping the emotional body of light. Two centuries later, every mood board you\'ve ever made proves he was right.',
      'Josef Albers taught at Yale for twenty years and his entire curriculum was basically: stare at two colors next to each other and describe what happens to your nervous system. He proved that color is never stable — it shifts depending on its neighbor, its quantity, its context. Sound familiar? That\'s how tarot works. That\'s how the I Ching works. The meaning lives in the relationship, never in the thing alone.',
      'Kandinsky went further. He assigned colors to shapes and sounds. Yellow was a triangle and a trumpet. Blue was a circle and a cello. He painted like he was composing a symphony — and he heard it, literally. He had synesthesia. The paintings weren\'t metaphors for music. They were music, rendered in a medium that doesn\'t require ears.',
      'When you\'re choosing a palette for a project and you reject one swatch because it feels "wrong" — that\'s not taste. That\'s perception operating below language. You\'re reading the card. Trust the reading.',
      'Every screenprint that works, every poster that stops you on the street — the color got there first, before you read a single word. The ink is the incantation. The paper is the altar. The squeegee is the wand, and the printer knows it even if they\'d never say it out loud.',
    ],
    images: ['images/00a0a_it0V64sbO2y_0fu0b6_600x450.jpg'],
  },
  {
    slug: 'the-alchemy-of-printmaking',
    title: 'The Alchemy of Printmaking',
    date: 'February 24, 2026',
    tags: ['magic', 'printmaking'],
    image: 'images/00L0L_13tZ8VWZmLk_0go0t2_1200x900.jpg',
    body: [
      'Alchemy wasn\'t about turning lead into gold. Any halfway honest alchemist will tell you the real work was turning the self into something refined. The lead is you. The gold is you, transformed. Printmaking operates on exactly the same principle — you take a raw material, subject it to pressure and chemistry, and what comes out the other side is something that didn\'t exist before the process.',
      'Etching is the most literally alchemical. You coat a copper plate in wax, draw through the wax with a needle, then drop the whole thing in acid. The acid bites where your hand moved. Your drawing becomes a scar in metal. When you ink the plate and run it through the press, the scar speaks. Rembrandt made etchings that still feel like they\'re breathing. Three hundred and fifty years of breath held in acid-bitten copper.',
      'Screenprinting is the democratic branch of the same tradition. Warhol took the art-world\'s obsession with the unique object and ran it through a silk screen two hundred times. The repetition was the point. In Yoruba textile tradition, the same principle applies — adire cloth is made by resist-dyeing, blocking the indigo with cassava paste, repeating a pattern until the cloth itself becomes a kind of chant.',
      'There\'s a reason printmakers talk about "pulling" a print. You\'re not making it. You\'re extracting it. The image is latent in the matrix — the block, the plate, the screen — and the act of printing is an act of revelation. The thing was always there. You just applied enough pressure to make it visible.',
      'Every artist who has ever stood at a press and peeled back the paper to see the first proof knows that the ten seconds between lifting the corner and seeing the full image is the closest you get to prophecy in a studio. You set up the conditions. You did the work. But you still don\'t know what\'s coming until it arrives.',
      'That gap — between intention and result — is where the magic lives. Not in the technique. In the surrender.',
    ],
    images: ['images/00L0L_13tZ8VWZmLk_0go0t2_1200x900.jpg'],
  },
  {
    slug: 'dreams-as-design-briefs',
    title: 'Dreams as Design Briefs',
    date: 'February 17, 2026',
    tags: ['magic', 'art'],
    image: 'images/Dreamcatcher1.jpg',
    body: [
      'Kekulé dreamed of a snake eating its own tail and woke up with the structure of benzene. McCartney dreamed the melody of "Yesterday" so completely that he spent weeks asking people if he\'d accidentally stolen it. Dalí used to fall asleep holding a key over a metal plate — the clang of the key dropping would wake him at the exact threshold of sleep, and he\'d paint whatever he saw in that liminal flash.',
      'These aren\'t cute anecdotes. They\'re case studies. The subconscious mind is a better art director than any human being alive, because it doesn\'t care about the brief. It doesn\'t care about the client. It just shows you what\'s true, in symbols, and dares you to figure out what it means.',
      'The Talmud says a dream uninterpreted is like a letter unopened. The Ojibwe dreamcatcher isn\'t a decoration — it\'s a filter. It catches the noise and lets the signal through. Every morning you wake up with fragments of images, feelings, arrangements of color and space that don\'t make logical sense. Those are your briefs. The dream is not asking you to understand it. It\'s asking you to make something with it.',
      'Fellini kept a dream journal his entire career. So did Kurosawa. His film "Dreams" is eight of them, rendered literally — a boy follows a fox wedding procession through rain, a soldier meets his dead platoon in a tunnel. No metaphor. Just the dream, presented with total conviction. That\'s the move. You don\'t interpret the dream. You execute it.',
      'The Surrealists built an entire methodology around this. Breton\'s automatic writing, Ernst\'s frottage, Leonora Carrington\'s fever-dream novels — they weren\'t trying to be weird. They were trying to be accurate. They were taking dictation from a part of the mind that speaks in images instead of words.',
      'Keep a notebook by the bed. Not your phone — a notebook. Write before the rational mind boots up and starts editing. The handwriting will be terrible. The ideas will be better than anything you produce on deadline. The dream doesn\'t know what\'s "on brand." That\'s precisely why it\'s useful.',
    ],
    images: ['images/Dreamcatcher1.jpg'],
  },
  {
    slug: 'the-copernican-swerve',
    title: 'The Copernican Swerve: Are We the Giants or the Little People?',
    date: 'February 10, 2026',
    tags: ['art', 'technology'],
    image: 'images/Screenshot 2025-03-16 at 3.39.33 PM.png',
    body: [
      'In Lilliput, Gulliver is the giant. He can crush cities, rearrange armies, extinguish a palace fire with his body alone. He has godlike power and absolutely no idea what to do with it. In Brobdingnag, he\'s the miniature. He\'s a curiosity on a dinner plate. A baby nearly swallows him. Same man, same mind, same capabilities — the only thing that changed was the scale of the room.',
      'That\'s the AI moment right now, and nobody is talking about it honestly. When you open a generative tool and it produces a full campaign in thirty seconds, you\'re Gulliver in Lilliput. You are enormous. You can do things that would have taken a team of twelve a month. The temptation is to stomp around and feel powerful.',
      'But aim that same tool at the actual frontier — at consciousness, at taste, at the thing that makes one Coltrane solo different from another Coltrane solo — and suddenly you\'re on the dinner plate. You\'re tiny. The machine can approximate the surface of anything but the interior of nothing. And the gap between surface and interior is where all the interesting work lives.',
      'Now flip the lens toward space. We send a probe four billion miles to photograph the rings of Saturn and the image makes you weep. We are incomprehensibly small in a universe that doesn\'t know we exist, and yet we made the camera, we wrote the math, we pointed it at the right patch of nothing and waited thirteen years for the postcard. That\'s Brobdingnag — we\'re miniature, and we\'re magnificent anyway.',
      'Copernicus didn\'t just move the Earth. He moved humanity from the center of the story to one actor among many. That\'s the real swerve. Not "AI will replace us" and not "AI is just a tool." The honest answer is: it depends on the scale of the room you\'re standing in. For production, we\'re giants. For meaning, we\'re still the little people, and the universe is still very large.',
      'Swift understood this because satire requires holding two scales in your head simultaneously. The Lilliputians have a full civilization with wars and politics and court intrigue — it\'s completely real to them, and completely absurd from six feet up. That\'s what most AI-generated content looks like to someone with taste. Technically complete. Spiritually miniature.',
      'The move isn\'t to reject the tool or worship it. The move is to know which island you\'re standing on at any given moment. Use the giant\'s power for the giant\'s work. But when the work requires being small — being human, being confused, being moved by something you can\'t explain — put the tool down and walk into the room at your actual size.',
    ],
    images: ['images/Screenshot 2025-03-16 at 3.39.33 PM.png'],
  },
  {
    slug: 'the-death-of-touch',
    title: 'The Death of Touch: Tactility and the Disappearing Object',
    date: 'February 3, 2026',
    tags: ['design', 'technology'],
    image: 'images/MM-and-Jerry-at-VFT-ca.-1976.jpg.webp',
    body: [
      'Pick up a record from the seventies. Feel the gatefold sleeve. The matte ink. The weight. Run a finger along the edge of the inner sleeve and feel the static catch. That object was designed to be held. The cover art was made at a scale meant for two hands and a lap. The typography was sized for someone sitting on a floor with time to kill. The entire medium assumed a body.',
      'Now open the same album on a streaming service. The cover art is a thumbnail. Nobody holds it. Nobody turns it over. The back cover — which used to be its own canvas, its own statement — doesn\'t exist. The liner notes are a scrollable text field nobody reads. The object evaporated and took an entire sensory dimension with it.',
      'This isn\'t nostalgia. It\'s a design problem. The first iPhones obsessed over how the device felt in the hand — the radius of every edge, the weight distribution. That was a team fighting to preserve tactility in a world that was going flat. The devices got thinner. The surfaces got smoother. Now everything feels like everything else.',
      'In the Kantamanto market in Accra, secondhand clothing arrives in bales from the West. The traders who sort it can identify a fabric\'s origin, quality, and decade by touch alone. They know more about textile in their fingertips than most fashion graduates know in their entire education. That knowledge is somatic. It lives in the hand, not the head.',
      'Bookbinders know this. Printmakers know this. Potters, weavers, woodworkers — anyone whose medium pushes back. There\'s a kind of thinking that only happens through resistance. When the material says no and you have to negotiate. A screen never says no. It accepts every gesture equally. That frictionlessness feels like freedom but it\'s actually sensory deprivation.',
      'The most radical design decision you can make in 2026 is to make something that has to be touched. A zine on cheap paper. A hand-pulled print with ink you can feel with your eyes closed. A business card with a letterpress indent. Not because analog is better. Because the body is a thinking organ, and we\'ve been starving it.',
    ],
    images: ['images/MM-and-Jerry-at-VFT-ca.-1976.jpg.webp'],
  },
  {
    slug: 'folk-magic-and-textile-art',
    title: 'Folk Magic and Textile Art: The Thread That Binds',
    date: 'January 27, 2026',
    tags: ['magic', 'art'],
    image: 'images/Kantamanto-Market-1024x1024.jpg',
    body: [
      'In Greek myth, the Fates are weavers. Clotho spins the thread. Lachesis measures it. Atropos cuts it. Your life — its length, its texture, its pattern — is a textile. This isn\'t a metaphor the Greeks invented. It\'s one they inherited from something much older. Across West Africa, the Akan people weave kente cloth with patterns that carry specific proverbs and philosophical meanings. Each combination of color and weave is a sentence. The cloth speaks.',
      'The Navajo understood weaving as a sacred act taught to humans by Spider Woman. A traditional Navajo rug contains a deliberate imperfection — the spirit line — a thread that breaks the border pattern so the weaver\'s spirit isn\'t trapped inside the work. That\'s the most sophisticated design philosophy anyone has ever articulated: build the system, then build the exit.',
      'In Eastern Europe, the vyshyvanka — the embroidered shirt — carries regional codes in its patterns. Red thread for protection. Geometric borders for continuity. Specific stitches for specific prayers. When your grandmother embroidered a pillowcase, she wasn\'t decorating. She was encoding. The thread was the medium. The pattern was the message. The repetitive motion of the needle was the trance state that made the message stick.',
      'Anni Albers left the Bauhaus and spent decades studying Pre-Columbian textiles in Peru and Mexico. She wrote that Western art had made a catastrophic error by separating "art" from "craft" — the loom from the canvas, the useful from the beautiful. The ancient weavers didn\'t make that distinction. The blanket that kept you warm was also the prayer that kept you safe. Same object. Same thread.',
      'The Gee\'s Bend quilters in Alabama built from scraps and made compositions that ended up in MoMA. The art world called them "abstract." The quilters called them "quilts." The gap between those two words is where the entire Western art establishment lives, and it\'s not a flattering address.',
      'When you choose a fabric, when you stitch a patch onto a jacket, when you pull a thread through anything — you\'re joining a lineage that predates written language. The textile arts are the original design discipline. Everything else is a branch on that tree.',
    ],
    images: ['images/Kantamanto-Market-1024x1024.jpg'],
  },
  {
    slug: 'a-conversation-with-light',
    title: 'A Conversation with Light: Studio Visit with a Venice Painter',
    date: 'January 20, 2026',
    tags: ['venice', 'art'],
    image: 'images/images.jpg',
    body: [
      'The studio is on a side street between Rose and the canal, in one of those buildings that looks like a garage from the outside and a cathedral from the inside. Concrete floor, paint on everything, north-facing windows that let in the kind of light that doesn\'t lie. The painter — who asked to go by first name only — has been in this room since the nineties, back when the rent was possible and nobody on the east side of Lincoln had heard the word "artisanal."',
      '"I paint what the light is doing. That\'s it. That\'s the whole practice." She says this like it\'s obvious, which it is, and also like it\'s enough, which it is. There are thirty canvases stacked against the wall, all of them some version of the same subject: the quality of light at a specific time, in a specific room, on a specific surface. Matisse spent his last years doing the same thing with scissors. She\'s doing it with oil and a discipline that makes monks look fidgety.',
      'The Venice light is different. Anyone who\'s lived here longer than a season knows it. The marine layer burns off around eleven and for about an hour the whole neighborhood looks like a Hockney painting — flat, bright, shadows with hard edges. Then the afternoon haze rolls in and everything softens. By five the light is coming sideways off the ocean and every wall on every building is a different color than it was at noon. "That hour around five is the one I chase," she says. "It makes everything look true."',
      '"People come here and say they want to be artists in LA because of the lifestyle. That\'s backwards. You become an artist here because the light won\'t leave you alone. It\'s confrontational. It shows you everything." She gestures at a canvas that\'s mostly white with a band of pale gold across the bottom third. It looks simple. It took four months.',
      '"I don\'t paint for galleries. I don\'t paint for Instagram. I paint because I made an agreement with this room thirty years ago and I haven\'t broken it." There\'s a Matisse print tacked to the wall — one of the ink portraits, a woman\'s face in six lines. "He knew," she says. "The line isn\'t describing the face. The line is the face. When I get a painting right, the paint isn\'t describing the light. The paint is the light."',
      'She offers coffee. The cup has paint on the handle. Outside, the afternoon is shifting toward that golden hour she mentioned, and even through the dirty windows you can see it happening — the whole street warming by two degrees of color, every shadow stretching east. She doesn\'t look up. She\'s already mixing.',
    ],
    images: ['images/images.jpg', 'images/e627001e7e09adc505b1afdcaba9d524.jpg'],
  },
];

// Blog index
mkdirSync('blog', { recursive: true });

// Collect all unique tags
const allBlogTags = [...new Set(blogPosts.flatMap(p => p.tags || []))].sort();

const blogListHtml = `
<div class="blog-grid-wrap">
  <div class="blog-grid">
    ${blogPosts.map(post => `
    <a href="${post.slug}.html" class="blog-card" data-filters="${(post.tags || []).join(' ')}">
      <div class="card-image">
        <img src="${post.image}" alt="${post.title}" loading="lazy">
      </div>
      <h2 class="card-title">${post.title}</h2>
      <time class="blog-date">${post.date}</time>
    </a>`).join('\n')}
  </div>
</div>`;

writeFileSync('blog/index.html', page('Blog — Dalton Corr', 'Blog', '../', blogListHtml));
console.log('  blog/index.html');

// Individual blog posts
for (const post of blogPosts) {
  // Interleave images into the body text
  const bodyWithImages = [];
  const imgs = [...post.images];
  // Lead image first
  bodyWithImages.push(`<img class="blog-inline-img" src="${imgs.shift() || post.image}" alt="" loading="lazy">`);
  for (let i = 0; i < post.body.length; i++) {
    bodyWithImages.push(`<p>${post.body[i]}</p>`);
    // Insert an image after every 2 paragraphs if available
    if ((i + 1) % 2 === 0 && imgs.length > 0) {
      bodyWithImages.push(`<img class="blog-inline-img" src="${imgs.shift()}" alt="" loading="lazy">`);
    }
  }
  // Any remaining images at the end
  for (const img of imgs) {
    bodyWithImages.push(`<img class="blog-inline-img" src="${img}" alt="" loading="lazy">`);
  }

  const postHtml = `
<article class="blog-article">
  <a href="index.html" class="blog-back">&larr; All posts</a>
  <header class="blog-article-header">
    <time class="blog-date">${post.date}</time>
    <h1 class="blog-article-title">${post.title}</h1>
  </header>
  <div class="blog-article-body">
    ${bodyWithImages.join('\n    ')}
  </div>
</article>`;

  writeFileSync(`blog/${post.slug}.html`, page(`${post.title} — Dalton Corr`, 'Blog', '../', postHtml));
  console.log(`  blog/${post.slug}.html`);
}

console.log('\nDone! All pages generated.');
