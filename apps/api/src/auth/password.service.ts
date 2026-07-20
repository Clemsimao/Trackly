import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Paramètres Argon2id recommandés OWASP (19 MiB, 2 itérations, 1 thread)
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }

  /**
   * Hash factice vérifié quand l'utilisateur n'existe pas : le temps de réponse
   * de /login reste identique e-mail connu ou non (anti-énumération, story A2).
   */
  private dummyHashPromise?: Promise<string>;

  async verifyDummy(password: string): Promise<void> {
    this.dummyHashPromise ??= this.hash('dummy-password-for-timing');
    await this.verify(await this.dummyHashPromise, password);
  }
}
