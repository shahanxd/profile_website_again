import { draft, type LinkItem, type SiteContent } from './types';

/**
 * Everything the site says lives here. Facts below come from the owner's
 * public READMEs. Two things mark what the owner still has to write or supply
 * (search for them): wording wrapped in draft() is not the owner's yet, and
 * `confirmed: false` is a fact or piece not confirmed or supplied yet. Both
 * ship, so stand-ins are written as stand-ins: they say what will go there,
 * and never invent a name, a client, an award or a number.
 */

const github: LinkItem = { kind: 'social', label: 'github', href: 'https://github.com/shahanxd' };
const linkedin: LinkItem = { kind: 'social', label: 'linkedin', href: 'https://linkedin.com/in/shahanxd' };
const instagram: LinkItem = { kind: 'social', label: 'instagram', href: 'https://instagram.com/notshahanxd' };
// the handle youtube itself gives for the owner's channel (id UCyjEeSvqUYPtwiZmyd1q_Yw)
const youtube: LinkItem = { kind: 'social', label: 'youtube', href: 'https://youtube.com/@shahanxd4734' };

const repo = (name: string): LinkItem => ({
  kind: 'repo',
  label: 'source',
  href: `https://github.com/shahanxd/${name}`,
});

export const site: SiteContent = {
  owner: { name: 'shahan', handle: 'shahanxd', city: 'delhi' },

  // `thumb` is the corner of the garden that stands in until a real screenshot, diagram or capture goes in `image`.
  projects: {
    metagross: {
      id: 'metagross',
      name: 'metagross',
      size: 'feature',
      line: draft('a small ground robot that finds its way with a camera and no gps.'),
      body: draft(
        'most planners treat ground they have not seen as free space, which is how a robot drives into a ditch. metagross only drives on ground its stereo camera has actually observed, and only as fast as it can stop inside it. i built the onboard stack, a closed-loop simulator to test it in, and a ledger that every reported number has to pass through.',
      ),
      results: [
        { value: '33 / 60', label: 'held-out simulated runs reached the goal', confirmed: true },
        { value: '~420', label: 'tests in the suite', confirmed: true },
        { value: 'sih 2026', label: 'smart india hackathon submission', confirmed: true },
      ],
      stack: ['python', 'stereo vision', 'visual odometry', 'mppi planning', 'three.js simulator'],
      links: [repo('metagross')],
      thumb: 'carpet',
      caption: draft('an illustration, not telemetry. the rover plans only through cells it has seen; hatched ground is off limits.'),
    },
    cassetto: {
      id: 'cassetto',
      name: 'cassetto',
      size: 'feature',
      line: draft('gives an ai coding assistant a map of your codebase.'),
      body: draft(
        'an assistant can read the files you have open, but it cannot see what calls what, or what breaks if you change a function. cassetto indexes a repository into a call graph, a vector index and a keyword index, and serves them to the assistant as tools. everything runs on your own machine.',
      ),
      results: [
        { value: '18', label: 'tools served over mcp', confirmed: true },
        { value: '13', label: 'languages parsed', confirmed: true },
        { value: '26 ms', label: 'to list everything a change would touch', confirmed: true },
      ],
      stack: ['python', 'tree-sitter', 'lancedb', 'duckdb', 'sqlite fts5', 'mcp'],
      links: [
        repo('cassetto'),
        { kind: 'package', label: 'pypi', href: 'https://pypi.org/project/cassetto/' },
      ],
      thumb: 'lantern',
      caption: draft('look up one symbol, and what it calls and what calls it light up, then one step further out.'),
    },
    undumployed: {
      id: 'undumployed',
      name: 'undumployed',
      size: 'feature',
      line: draft('every funded opportunity a student can actually apply to, checked by hand.'),
      body: draft(
        'internships, fellowships, scholarships, hackathons and free perks for students in india, each one verified against its official page and paired with a reality check: who really gets in, and what the page does not tell you. the site is generated from plain markdown, with filters, saved items and deadline reminders.',
      ),
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
      caption: draft('every entry is opened, read against its official page, and stamped.'),
    },
    sumud: {
      id: 'sumud',
      name: 'sumud',
      size: 'grid',
      tone: 'plain',
      line: 'a 2d narrative adventure about one family in gaza, told over ten days. a game about staying.',
      body: draft('built in godot 4, with automated play-through bots and tests that run before every commit.'),
      results: [],
      stack: ['godot 4', 'gdscript'],
      links: [repo('sumud')],
      thumb: 'sky',
    },
    'ml-compiler-bench': {
      id: 'ml-compiler-bench',
      name: 'ml-compiler-bench',
      size: 'grid',
      line: draft('reproducing two ml compiler papers on dynamic tensor shapes.'),
      body: draft('dvm and bladedisc, re-run and measured, with a full report.'),
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
      line: draft('how much faster is vllm than plain huggingface on a 4 gb gpu?'),
      body: draft('throughput, latency and memory, at full and 4-bit precision, on the smallest card i own.'),
      results: [],
      stack: ['python', 'vllm', 'huggingface', 'awq quantization'],
      links: [repo('vLLMbench')],
      thumb: 'horizon',
    },
    'good-nano-gpt': {
      id: 'good-nano-gpt',
      name: 'good-nano-gpt',
      size: 'grid',
      line: draft('a gpt-style language model, written from scratch.'),
      body: draft('to understand the thing, i built the thing.'),
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
      body: draft('what it does today, and who it is for, will be written here.'),
      results: [],
      stack: ['javascript'],
      links: [repo('salamah')],
      thumb: 'cypress',
    },
  },

  tech: {
    hero: {
      line: draft('i build ml systems, tools and small robots.'),
      sub: draft('student in delhi. i like work that is honest about what it knows.'),
    },
    nav: [
      { slot: 'about', label: 'about' },
      { slot: 'work', label: 'projects' },
      { slot: 'proof', label: 'achievements' },
      { slot: 'contact', label: 'contact' },
    ],
    about: {
      heading: draft('hi, i am shahan'),
      mark: 'shahan',
      paragraphs: [
        draft(
          'i started with cs50x in my first year and have not stopped building since. these days it is mostly machine learning systems: compilers, inference, and the tooling around them.',
        ),
        draft('i care about measuring things properly and saying plainly what worked and what did not.'),
        draft('the other half of me edits video and designs. that side of the garden is one switch away.'),
      ],
      toolkit: ['python', 'c++', 'javascript', 'pytorch', 'godot', 'react', 'sql', 'latex'],
    },
    work: {
      heading: draft('things i have built'),
      mark: 'built',
      intro: draft('three in depth, then the rest.'),
      projects: [
        'metagross',
        'cassetto',
        'undumployed',
        'sumud',
        'ml-compiler-bench',
        'vllmbench',
        'good-nano-gpt',
        'salamah',
      ],
    },
    band: {
      line: draft('built late, tested properly.'),
      // the projects' own confirmed figures; the old site's counts (leetcode, open source) are in the achievements below
      numbers: [
        { value: '700+', label: 'entries in undumployed', confirmed: true },
        { value: '~420', label: 'tests in metagross', confirmed: true },
        { value: '18', label: 'mcp tools in cassetto', confirmed: true },
      ],
    },
    proof: {
      heading: draft('along the way'),
      mark: 'the way',
      // Oldest first. A lamp is lit once its line has a year and is confirmed; an entry without a year is still to come.
      achievements: [
        {
          title: draft('cs50x completed; this site began as its final project'),
          detail: draft('where the building started.'),
          year: '2025',
          confirmed: false,
        },
        {
          // the old site's counts, as they stood then
          title: draft('500+ leetcode questions, and 2 open-source contributions'),
          detail: draft('counted in early 2025. both are due a recount.'),
          year: '2025',
          confirmed: false,
        },
        {
          // first release on pypi: 27 may 2026
          title: draft('cassetto published on pypi'),
          detail: draft('one pip install away.'),
          year: '2026',
          href: 'https://pypi.org/project/cassetto/',
          confirmed: true,
        },
        {
          // the submission is a confirmed fact (see metagross above); the result is not in yet
          title: draft('smart india hackathon 2026: metagross submitted'),
          detail: draft('how far it went will be written here, whichever way it goes.'),
          year: '2026',
          confirmed: true,
        },
        {
          title: draft('a hackathon result will be pinned here.'),
          detail: draft('the real placing, not a rounded-up one.'),
          confirmed: false,
        },
        { title: draft('the next line goes here, once it is earned.'), confirmed: false },
      ],
    },
    contact: {
      heading: draft('say hello'),
      mark: 'hello',
      line: draft('the fastest way to reach me is a message.'),
      note: draft('an email address and a resume will be linked here.'),
      links: [github, linkedin],
    },
  },

  creative: {
    hero: {
      line: draft('i edit video, design, and make things worth looking at.'),
      sub: draft('editor and designer in delhi.'),
    },
    nav: [
      { slot: 'about', label: 'why' },
      { slot: 'work', label: 'work' },
      { slot: 'proof', label: 'feedback' },
      { slot: 'contact', label: 'contact' },
    ],
    about: {
      heading: draft('why i do this'),
      mark: 'this',
      paragraphs: [
        draft('this is where i say why i edit and design. the honest version is still being written.'),
        draft('it will be short, and it will not use the word passionate.'),
      ],
      toolkit: ['premiere pro', 'photoshop', 'lightroom', 'illustrator', 'canva'],
    },
    work: {
      heading: draft('selected work'),
      mark: 'work',
      intro: draft('the real pieces are on their way. until then, the garden is standing in for them.'),
      items: [
        {
          id: 'sumud',
          kind: 'game',
          tone: 'plain',
          title: 'sumud',
          role: 'a 2d narrative adventure about one family in gaza, told over ten days. a game about staying.',
          href: 'https://github.com/shahanxd/sumud',
          thumb: 'sky',
          standIn: draft('a still from the game will go here.'),
          confirmed: true,
        },
        {
          id: 'video-1',
          kind: 'video',
          title: draft('a video edit will sit here'),
          role: draft('the one i am proudest of, once i pick it.'),
          thumb: 'horizon',
          confirmed: false,
        },
        {
          id: 'video-2',
          kind: 'video',
          title: draft('another edit, probably a faster one'),
          role: draft('title, client and running time to come.'),
          thumb: 'pool',
          confirmed: false,
        },
        {
          id: 'video-3',
          kind: 'video',
          title: draft('a reel, when it is cut'),
          role: draft('a minute or so of the best bits.'),
          thumb: 'canopy',
          confirmed: false,
        },
        {
          id: 'design-1',
          kind: 'design',
          title: draft('a poster goes here'),
          role: draft('still choosing which one.'),
          thumb: 'pavilion',
          confirmed: false,
        },
        {
          id: 'design-2',
          kind: 'design',
          title: draft('a set of thumbnails'),
          role: draft('the set, side by side. to come.'),
          thumb: 'beds',
          confirmed: false,
        },
        {
          id: 'design-3',
          kind: 'design',
          title: draft('a brand piece'),
          role: draft('a mark, its colours, and where they went.'),
          thumb: 'lantern',
          confirmed: false,
        },
      ],
    },
    band: {
      line: draft('made at golden hour, mostly.'),
      numbers: [
        { value: '250+', label: 'videos produced', confirmed: false, asOf: 'early 2025' },
        { value: '15+', label: 'clients served', confirmed: false, asOf: 'early 2025' },
      ],
    },
    proof: {
      heading: draft('what clients said'),
      mark: 'said',
      testimonials: [
        {
          quote: draft("a client's words will sit here. something kind, hopefully."),
          name: draft('name, what they do'),
          confirmed: false,
        },
        {
          quote: draft('a second opinion goes here, ideally one about deadlines.'),
          name: draft('name, where they work'),
          confirmed: false,
        },
        {
          quote: draft('room for one more. short is fine.'),
          name: draft('name, how we met'),
          confirmed: false,
        },
      ],
    },
    contact: {
      heading: draft('work with me'),
      mark: 'with me',
      line: draft('tell me what you are making and when you need it.'),
      note: draft('an email address will be linked here.'),
      links: [instagram, youtube],
    },
  },
};
