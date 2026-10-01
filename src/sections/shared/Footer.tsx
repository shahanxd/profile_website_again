import { FlowerBed } from '../../components/FlowerBed';
import { KilimDivider } from '../../components/KilimDivider';
import { PixelLink } from '../../components/PixelButton';
import { Sprite } from '../../components/Sprite';

/**
 * The foot of the page, for both splits: the cat on the edge of the carpet
 * (asleep and breathing at night, sitting with a flick of its tail by day),
 * a line of small print with the way back up, and the flower bed the page
 * stands on.
 */
export function Footer({ name, city }: { name: string; city: string }) {
  return (
    <footer className="foot">
      <div className="page foot-cat" aria-hidden="true">
        <Sprite name="cat" />
      </div>
      <KilimDivider />
      <div className="page foot-row">
        <p>
          {name}, {city}
        </p>
        <PixelLink href="#top">back to the garden</PixelLink>
      </div>
      <FlowerBed />
    </footer>
  );
}
