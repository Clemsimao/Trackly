/** Erreurs normalisées de la couche fournisseurs (traduites en HTTP par le contrôleur). */
export class ProviderNotConfiguredError extends Error {
  constructor(readonly provider: string) {
    super(`Fournisseur ${provider} non configuré (clé API absente)`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderRequestError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
  ) {
    super(`Réponse ${status} du fournisseur ${provider}`);
    this.name = 'ProviderRequestError';
  }
}

export class NotFoundInProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly externalId: string,
  ) {
    super(`Contenu ${externalId} introuvable chez ${provider}`);
    this.name = 'NotFoundInProviderError';
  }
}
