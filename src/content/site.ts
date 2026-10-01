import media from './showcaseMedia.json';
import { draft, type LinkItem, type Picture, type ShowcaseItem, type SiteContent } from './types';

/**
 * Everything the site says lives here. Facts come from the owner: the public
 * READMEs, the resume (public/shahan-ayyubi-resume.pdf) and what the owner
 * has said. Two things mark what the owner still has to write or supply
 * (search for them): wording wrapped in draft() is a stand-in, and
 * `confirmed: false` is a fact or piece not confirmed or supplied yet. Both
 * ship, so stand-ins are written as stand-ins: they say what will go there,
 * and never invent a name, a client, an award or a number.
 *
 * The showcase's files (videos, design pages, photographs) are made by
 * scripts/build-showcase.py, which also writes their sizes to
 * showcaseMedia.json; titles, lines and alt text are written here.
 */

const email: LinkItem = { kind: 'email', label: 'email', href: 'mailto:shahanxd@gmail.com' };
const resume: LinkItem = { kind: 'resume', label: 'resume', href: '/shahan-ayyubi-resume.pdf' };
const github: LinkItem = { kind: 'social', label: 'github', href: 'https://github.com/shahanxd' };
const linkedin: LinkItem = { kind: 'social', label: 'linkedin', href: 'https://linkedin.com/in/shahanxd' };
const instagram: LinkItem = { kind: 'social', label: 'instagram', href: 'https://instagram.com/shahanxdxd' };
// the handle youtube itself gives for the owner's channel (id UCyjEeSvqUYPtwiZmyd1q_Yw)
const youtube: LinkItem = { kind: 'social', label: 'youtube', href: 'https://youtube.com/@shahanxd4734' };

const repo = (name: string): LinkItem => ({
  kind: 'repo',
  label: 'source',
  href: `https://github.com/shahanxd/${name}`,
});

/**
 * sumud's own picture: the game's key art, which carries its own title
 * lettering (so it is shown whole, never cropped). It is the one place this
 * picture is named: sumud's block on the creative side and its card on the
 * tech side both show it. Set it to undefined and both go back to their
 * stand-ins (the garden's sky and a line saying so; a card without a
 * picture). To change the picture, replace the file (build-showcase.py
 * writes it and its size) and say here what it shows.
 */
const sumudStill: Picture | undefined = {
  ...media.stills.sumud,
  alt: 'the key art for sumud: kites flying over a city by the sea at dusk, a small figure on the shore holding the line of one, and the title in english and arabic',
};

/** A video of the showcase: its file and poster come from showcaseMedia.json; what the poster shows is said here. */
function video(id: keyof typeof media.videos, title: string, line: string, posterAlt: string): ShowcaseItem {
  const { src, poster, width, height, seconds } = media.videos[id];
  return { id, kind: 'video', title, role: line, video: { src, width, height, seconds, poster: { ...poster, alt: posterAlt } }, confirmed: true };
}

/** A design: every page of it, the first being its cover. `what` is the piece in a few words, for the alt text of each page. */
function design(id: keyof typeof media.designs, title: string, line: string, what: string): ShowcaseItem {
  const { pages } = media.designs[id];
  const alt = (i: number) => (pages.length > 1 ? `${what}, page ${i + 1} of ${pages.length}` : what);
  return { id, kind: 'design', title, role: line, pages: pages.map((page, i) => ({ ...page, alt: alt(i) })), confirmed: true };
}

/** A photograph, under the owner's own title for it. */
function photo(id: keyof typeof media.photos, title: string, alt: string): ShowcaseItem {
  const { thumb, full } = media.photos[id];
  return { id, kind: 'photo', title, image: { ...thumb, alt }, full: { ...full, alt }, confirmed: true };
}

export const site: SiteContent = {
  owner: { name: 'shahan', handle: 'shahanxd', city: 'delhi' },

  // `thumb` is the corner of the garden that stands in until a real screenshot, diagram or capture goes in `image`.
  projects: {
    metagross: {
      id: 'metagross',
      name: 'metagross',
      size: 'feature',
      line: 'a small ground robot that finds its way with a camera and no gps.',
      body: 'most planners treat ground they have not seen as free space, which is how a robot drives into a ditch. metagross only drives on ground its stereo camera has actually observed, and only as fast as it can stop inside it. i built the onboard stack, a closed-loop simulator to test it in, and a ledger that every reported number has to pass through.',
      results: [
        { value: '33 / 60', label: 'held-out simulated runs reached the goal', confirmed: true },
        { value: '~420', label: 'tests in the suite', confirmed: true },
        { value: 'sih 2026', label: 'smart india hackathon submission', confirmed: true },
      ],
      stack: ['python', 'stereo vision', 'visual odometry', 'mppi planning', 'three.js simulator'],
      links: [repo('metagross')],
      thumb: 'carpet',
      caption: 'an illustration, not telemetry. the rover plans only through cells it has seen; hatched ground is off limits.',
    },
    cassetto: {
      id: 'cassetto',
      name: 'cassetto',
      size: 'feature',
      line: 'gives an ai coding assistant a map of your codebase.',
      body: 'an assistant can read the files you have open, but it cannot see what calls what, or what breaks if you change a function. cassetto indexes a repository into a call graph, a vector index and a keyword index, and serves them to the assistant as tools. everything runs on your own machine.',
      results: [
        { value: '18', label: 'tools served over mcp', confirmed: true },
        { value: '13', label: 'languages parsed', confirmed: true },
        { value: '26 ms', label: 'to list everything a change would touch', confirmed: true },
        { value: '92%', label: 'retrieval precision, at 91% recall', confirmed: true },
      ],
      stack: ['python', 'tree-sitter', 'lancedb', 'duckdb', 'sqlite fts5', 'mcp'],
      links: [
        repo('cassetto'),
        { kind: 'package', label: 'pypi', href: 'https://pypi.org/project/cassetto/' },
      ],
      thumb: 'lantern',
      caption: 'look up one symbol, and what it calls and what calls it light up, then one step further out.',
    },
    undumployed: {
      id: 'undumployed',
      name: 'undumployed',
      size: 'feature',
      line: 'every funded opportunity a student can actually apply to, checked by hand.',
      body: 'internships, fellowships, scholarships, hackathons and free perks for students in india, each one verified against its official page and paired with a reality check: who really gets in, and what the page does not tell you. the site is generated from plain markdown, with filters, saved items and deadline reminders.',
      results: [
        { value: '700+', label: 'entries, each with a reality check', confirmed: true },
        { value: '0', label: 'aggregators, affiliate links or paid "internships"', confirmed: true },
      ],
      stack: ['javascript', 'markdown', 'python build scripts', 'ci link checks'],
      links: [
        { kind: 'live', label: 'visit', href: 'https://undumployed.vercel.app/' },
        repo('undumployed'),
      ],
      thumb: 'pavilion',
      caption: 'every entry is opened, read against its official page, and stamped.',
    },
    sumud: {
      id: 'sumud',
      name: 'sumud',
      size: 'grid',
      tone: 'plain',
      line: 'a 2d narrative adventure about one family in gaza, told over ten days. a game about staying.',
      body: 'built in godot 4, with automated play-through bots and tests that run before every commit.',
      results: [],
      stack: ['godot 4', 'gdscript'],
      links: [repo('sumud')],
      thumb: 'sky',
      image: sumudStill,
    },
    sparrow: {
      id: 'sparrow',
      name: 'project sparrow',
      size: 'grid',
      line: 'a ward-level air-quality dashboard for delhi.',
      body: 'one number for a whole city says little about your street. project sparrow draws delhi ward by ward on choropleth maps, placing each reading in the ward it was taken in.',
      results: [{ value: '250+', label: 'municipal wards mapped', confirmed: true }],
      stack: ['react', 'django', 'leaflet', 'turf.js'],
      links: [{ kind: 'live', label: 'visit', href: 'https://sparrowxd.vercel.app' }, repo('sparrow')],
      thumb: 'beds',
    },
    'project-canary': {
      id: 'project-canary',
      name: 'project canary',
      size: 'grid',
      line: 'forecasts nitrogen dioxide and ozone at ground level.',
      body: 'a cnn-bilstm with temporal attention that fuses sentinel-5p satellite imagery, era5 weather data and ground-station readings. scored on held-out data.',
      results: [
        { value: '0.76', label: 'r² on NO₂', confirmed: true },
        { value: '0.67', label: 'r² on O₃', confirmed: true },
        { value: '10%', label: 'better rmse than an xgboost baseline', confirmed: true },
      ],
      stack: ['python', 'pytorch', 'sentinel-5p', 'era5'],
      links: [repo('Project-Canary')],
      thumb: 'horizon',
    },
    'ml-compiler-bench': {
      id: 'ml-compiler-bench',
      name: 'ml-compiler-bench',
      size: 'grid',
      line: 'reproducing two ml compiler papers on dynamic tensor shapes.',
      body: 'dvm and bladedisc, re-run and measured, with a full report.',
      results: [
        { value: '81', label: 'measurements', confirmed: true },
        { value: '8', label: 'figures', confirmed: true },
      ],
      stack: ['python', 'pytorch', 'torchscript', 'bladedisc'],
      links: [repo('ml-compiler-bench')],
      thumb: 'pool',
    },
    vllmbench: {
      id: 'vllmbench',
      name: 'vLLMbench',
      size: 'grid',
      line: 'how much faster is vllm than plain huggingface on a 4 gb gpu?',
      body: 'throughput, latency and memory, at full and 4-bit precision, on the smallest card i own.',
      results: [],
      stack: ['python', 'vllm', 'huggingface', 'awq quantization'],
      links: [repo('vLLMbench')],
      thumb: 'horizon',
    },
    'good-nano-gpt': {
      id: 'good-nano-gpt',
      name: 'good-nano-gpt',
      size: 'grid',
      line: 'a gpt-style language model, written from scratch.',
      body: 'to understand the thing, i built the thing.',
      results: [],
      stack: ['python', 'pytorch'],
      links: [repo('good-nano-gpt')],
      thumb: 'canopy',
    },
    salamah: {
      id: 'salamah',
      name: 'salamah',
      size: 'grid',
      tone: 'plain',
      line: 'a tool to help ngos track displaced people in a crisis.',
      // still a stand-in: the owner has not said what it does today
      body: draft('what it does today, and who it is for, will be written here.'),
      results: [],
      stack: ['javascript'],
      links: [repo('salamah')],
      thumb: 'cypress',
    },
  },

  tech: {
    hero: {
      line: 'i build ml systems, tools and small robots.',
      sub: 'student of science. i like work that is honest about what it knows.',
    },
    nav: [
      { slot: 'about', label: 'about' },
      { slot: 'work', label: 'projects' },
      { slot: 'proof', label: 'achievements' },
      { slot: 'contact', label: 'contact' },
    ],
    about: {
      heading: 'hi, i am shahan',
      mark: 'shahan',
      paragraphs: [
        // the owner's own wording, kept exactly as written
        'i study computer engineering, undergrad at that thing, and i have been building since cs50x in my first year. these days it is mostly machine learning systems: compilers, inference, and the tooling around them.',
        "right now i'm into ML research, or rather its intersection with irl applications. (i help make transformers cheaper to run)",
        'i care about measuring things properly and saying plainly what worked and what did not.',
      ],
      toolkit: ['python', 'c++', 'javascript', 'typescript', 'pytorch', 'mern', 'sql', 'git', 'linux', 'godot', 'claude code'],
      resume,
    },
    work: {
      heading: 'things i have built',
      mark: 'built',
      intro: 'three in depth, then the rest.',
      projects: [
        'metagross',
        'cassetto',
        'undumployed',
        'sumud',
        'sparrow',
        'project-canary',
        'ml-compiler-bench',
        'vllmbench',
        'good-nano-gpt',
        'salamah',
      ],
    },
    band: {
      line: 'built late, tested properly.',
      // the projects' own confirmed figures
      numbers: [
        { value: '700+', label: 'entries in undumployed', confirmed: true },
        { value: '~420', label: 'tests in metagross', confirmed: true },
        { value: '18', label: 'mcp tools in cassetto', confirmed: true },
      ],
    },
    proof: {
      heading: 'along the way',
      mark: 'the way',
      // In the owner's order: the newest and largest first. Every line here is confirmed, so every lamp is lit; a year is given where it is known.
      achievements: [
        {
          title: 'amazon ml challenge 2026: scored 97.56, ranked around 1.4k among 30k teams',
          year: '2026',
          confirmed: true,
        },
        {
          title: 'research intern at iiit delhi, on transformer inference efficiency',
          year: '2026, ongoing',
          confirmed: true,
        },
        {
          title: 'google developer groups on campus, jmi: cloud lead, then on-campus organiser',
          detail: 'led a team of five, ran two google cloud workshops for 75+ people, and got 150+ students through the study jam.',
          year: '2025 to 2026',
          confirmed: true,
        },
        { title: 'leetcode: 700+ problems solved', confirmed: true },
        { title: 'hackfinance, iiit delhi: finalist out of 100+ teams', confirmed: true },
        {
          // the submission is a fact (see metagross above); the result is not in yet, so the line under it is still a stand-in
          title: 'smart india hackathon 2026: metagross submitted',
          detail: draft('how far it went will be written here, whichever way it goes.'),
          year: '2026',
          confirmed: true,
        },
        {
          // first release on pypi: 27 may 2026
          title: 'cassetto published on pypi',
          detail: 'one pip install away.',
          year: '2026',
          href: 'https://pypi.org/project/cassetto/',
          confirmed: true,
        },
        { title: 'cs50x (harvard), google cloud study jam, devops essentials (ibm)', confirmed: true },
      ],
    },
    contact: {
      heading: 'say hello',
      mark: 'hello',
      line: 'the fastest way to reach me is an email.',
      links: [email, github, linkedin, resume],
    },
  },

  creative: {
    hero: {
      line: 'i do video, design, and make things worth looking at.',
      sub: 'videographer and designer. i shoot it, cut it, and make it look right.',
    },
    nav: [
      { slot: 'about', label: 'why' },
      { slot: 'work', label: 'work' },
      { slot: 'proof', label: 'feedback' },
      { slot: 'contact', label: 'contact' },
    ],
    about: {
      heading: 'why i do this',
      mark: 'this',
      paragraphs: [
        'i started making videos because the ones in my head looked better than the ones on my screen. so i kept going until the gap got smaller.',
        'somewhere along the way people started paying for it, and for a while i ran a small agency, teamV, with four other freelancers. 350+ videos in, i still open a timeline the same way: find the one moment that matters, then cut whatever is not helping it.',
        'these days i shoot as much as i edit, mostly on the phone in my pocket, and design whatever the video needs around it. i do this because making something look right is the most honest fun i know. still have not used the word passionate.',
      ],
      toolkit: [
        { name: 'nothing phone (3a) pro', note: 'main camera' },
        'filmora',
        'photoshop',
        'lightroom',
        'illustrator',
        'canva',
        'snapseed',
      ],
    },
    work: {
      heading: 'selected work',
      mark: 'work',
      intro: 'a little of each: video, design, photographs.',
      lines: { photo: 'shot on a nothing phone (3a) pro.' },
      // In the order the page shows them: the videos (the first is the featured one), the designs, the photographs, then sumud.
      items: [
        video(
          'showreel',
          'showreel',
          'a minute of everything: cuts, motion, colour, sound.',
          'shahan talking to the camera against a dark backdrop, his name drawn beside him in light',
        ),
        video(
          'process',
          'the process of creation',
          'a short film about making things. shot and cut by me.',
          'a red "on air" sign lit against the dark',
        ),
        video('udaipur', 'udaipur, fast', 'seven seconds of udaipur, cut quick.', 'flower pots along a windowsill in udaipur'),
        design(
          'xai-poster',
          'explainable ai, on one sheet',
          'a research poster, made with a friend.',
          'a research poster on explainable artificial intelligence',
        ),
        design(
          'smoke-house',
          'smoke house',
          'an identity for a hyderabadi bbq food box: mark, colours, packaging. a group project.',
          'the smoke house brand identity',
        ),
        design(
          'nothing-3a',
          'phone (3a), community edition draft',
          "my design draft for nothing's community edition.",
          'a design draft for the nothing phone (3a) community edition',
        ),
        photo('burns-and-melts', 'burns and melts until it doesnt', 'a candle flame up close, blue where it meets the wick'),
        photo('butter-aint-flying', 'butter aint flying', 'an orange butterfly on the corner of an instant photo of a white butterfly, in the dark'),
        photo('blue-clue', 'got any blue clue', 'a blue phone leaning against a blue paper coffee cup on a café table'),
        photo('sip', 'sip', 'a kitten drinking from a puddle beside a brick wall'),
        {
          id: 'sumud',
          kind: 'game',
          tone: 'plain',
          title: 'sumud',
          role: 'a 2d narrative adventure about one family in gaza, told over ten days. a game about staying.',
          href: 'https://github.com/shahanxd/sumud',
          // the stand-in (the garden's sky, and the line that says so) is only shown while sumudStill (above) is not set
          thumb: 'sky',
          standIn: draft('a still from the game will go here.'),
          image: sumudStill,
          confirmed: true,
        },
      ],
    },
    band: {
      line: 'made at golden hour, mostly.',
      // the owner's own counts, given in october 2026; "now" is what the panel says under them
      numbers: [
        { value: '350+', label: 'videos produced', confirmed: true, asOf: 'now' },
        { value: '20+', label: 'clients served', confirmed: true, asOf: 'now' },
        { value: '50+', label: 'designs', confirmed: true, asOf: 'now' },
        { value: 'endless', label: 'shots (photo and video)', confirmed: true, asOf: 'now' },
      ],
    },
    proof: {
      // one client wrote all four, so the heading does not say "clients"
      heading: 'what a client said',
      mark: 'said',
      note: 'four reviews from one returning client, five stars each time.',
      // The client's own words, exactly as written. The owner asked for no name and no dates.
      testimonials: [
        {
          quote:
            'This was a different type of project for a new client who we built an APP for and the videos Shahanayyubi created for our promotions were very professional. Great communication skills and fast but skilled delivery.',
          name: 'a returning client, five stars',
          confirmed: true,
        },
        {
          quote:
            'Lengthy project with three components and it was delivered quickly and with great skill. Great communication about what is needed and solutions to how to make it aesthetically appealing.',
          name: 'a returning client, five stars',
          confirmed: true,
        },
        {
          quote: 'Reliable, understands the assignment and very talented with video editing.',
          name: 'a returning client, five stars',
          confirmed: true,
        },
        {
          quote: 'Very reliable in video editing emergency.',
          name: 'a returning client, five stars',
          confirmed: true,
        },
      ],
    },
    contact: {
      heading: 'work with me',
      mark: 'with me',
      line: 'tell me what you are making and when you need it.',
      links: [email, instagram, youtube],
    },
  },
};
