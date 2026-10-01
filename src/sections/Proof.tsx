import { Text } from '../components/Text';
import { site } from '../content/site';
import { confirmedOnly } from '../content/visible';

export function TechProof() {
  const achievements = confirmedOnly(site.tech.proof.achievements);
  return (
    <ul className="divide-y divide-line border-y border-line">
      {achievements.map((achievement, i) => (
        <li key={i} className="flex flex-wrap items-baseline justify-between gap-4 py-5">
          <Text as="span" copy={achievement.title} className="text-lg" />
          {achievement.year && <span className="font-mono text-sm text-ink-2">{achievement.year}</span>}
        </li>
      ))}
    </ul>
  );
}

export function CreativeProof() {
  const { testimonials } = site.creative.proof;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {testimonials.map((testimonial, i) => (
        <figure key={i} className="border border-line p-6">
          <blockquote className="font-display text-xl">“{testimonial.quote}”</blockquote>
          <figcaption className="mt-4 text-sm text-ink-2">
            {testimonial.name}
            {testimonial.role && `, ${testimonial.role}`}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
