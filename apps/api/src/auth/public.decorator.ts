import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Routes accessibles sans session. Tout le reste est protégé par défaut. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
