import { draft, type LinkItem, type SiteContent } from './types';

/**
 * Everything the site says lives here. Facts below come from the owner's
 * public READMEs; wording wrapped in draft() is mine and waits for the owner.
 * Results marked confirmed: false are old or unverified and stay out of
 * production builds until the owner confirms them.
 */

const github: LinkItem = { kind: 'social', label: 'github', href: 'https://github.com/shahanxd' };
const linkedin: LinkItem = { kind: 'social', label: 'linkedin', href: 'https://linkedin.com/in/shahanxd' };
const instagram: LinkItem = { kind: 'social', label: 'instagram', href: 'https://instagram.com/notshahanxd' };
const youtube: LinkItem = {
  kind: 'social',
  label: 'youtube',
  href: 'https://youtube.com/@UCyjEeSvqUYPtwiZmyd1q_Yw',
};

const repo = (name: string): LinkItem => ({
  kind: 'repo',
  label: 'source',
  href: `https://github.com/shahanxd/${name}`,
});

export const site: SiteContent = {
  owner: { name: 'shahan', handle: 'shahanxd', city: 'delhi' },

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
    },
    salamah: {
      id: 'salamah',
      name: 'salamah',
      size: 'grid',
      tone: 'plain',
      line: 'a tool to help ngos track displaced people in a crisis.',
      body: draft('status and details to come from the owner.'),
      results: [],
      stack: ['javascript'],
      links: [repo('salamah')],
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
      paragraphs: [
        draft(
          'i started with cs50x in my first year and have not stopped building since. these days it is mostly machine learning systems: compilers, inference, and the tooling around them.',
        ),
        draft('i care about measuring things properly and saying plainly what worked and what did not.'),
      ],
      toolkit: ['python', 'c++', 'javascript', 'pytorch', 'godot', 'react', 'sql', 'latex'],
    },
    work: {
      heading: draft('things i have built'),
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
      numbers: [
        { value: '500+', label: 'leetcode questions', confirmed: false, asOf: 'early 2025' },
        { value: '2', label: 'open-source contributions', confirmed: false, asOf: 'early 2025' },
      ],
    },
    proof: {
      heading: draft('along the way'),
      achievements: [
        { title: draft('smart india hackathon 2026: metagross submitted'), year: '2026', confirmed: false },
        { title: draft('cassetto published on pypi'), year: '2026', confirmed: false },
        { title: draft('cs50x completed; this site began as its final project'), year: '2025', confirmed: false },
      ],
    },
    contact: {
      heading: draft('say hello'),
      line: draft('the fastest way to reach me is a message.'),
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
      paragraphs: [draft('your words go here: why you edit and design, and what you look for in a piece of work.')],
      toolkit: ['premiere pro', 'photoshop', 'lightroom', 'illustrator', 'canva'],
    },
    work: {
      heading: draft('selected work'),
      items: [
        {
          id: 'sumud',
          kind: 'game',
          tone: 'plain',
          title: 'sumud',
          role: 'a 2d narrative adventure about one family in gaza, told over ten days. a game about staying.',
          href: 'https://github.com/shahanxd/sumud',
          confirmed: true,
        },
        { id: 'video-1', kind: 'video', title: draft('a video edit of yours'), confirmed: false },
        { id: 'video-2', kind: 'video', title: draft('a video edit of yours'), confirmed: false },
        { id: 'design-1', kind: 'design', title: draft('a design piece of yours'), confirmed: false },
        { id: 'design-2', kind: 'design', title: draft('a design piece of yours'), confirmed: false },
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
      testimonials: [],
    },
    contact: {
      heading: draft('work with me'),
      line: draft('tell me what you are making and when you need it.'),
      links: [instagram, youtube],
    },
  },
};
