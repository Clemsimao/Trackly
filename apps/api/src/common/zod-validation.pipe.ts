import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Valide le corps de requête avec un schéma du paquet @trackly/contracts —
 * la même source de vérité que le front (exigence docs/cadrage/15).
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const first = result.error.issues[0];
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: first ? first.message : 'Données invalides',
      });
    }
    return result.data;
  }
}
