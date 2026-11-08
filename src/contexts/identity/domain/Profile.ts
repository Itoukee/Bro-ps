import type { DisplayName } from './DisplayName';
import type { DotAppearance } from './DotAppearance';

declare const brand: unique symbol;

export type RiderId = string & { readonly [brand]: 'RiderId' };

export type Profile = {
  riderId: RiderId;
  displayName: DisplayName;
  dotAppearance: DotAppearance;
};
