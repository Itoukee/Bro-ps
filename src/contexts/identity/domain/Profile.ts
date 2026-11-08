import type { DisplayName } from './DisplayName';

declare const brand: unique symbol;

export type RiderId = string & { readonly [brand]: 'RiderId' };

export type Profile = {
  riderId: RiderId;
  displayName: DisplayName;
};
