/**
 * Chaînes de l'interface (G2 : aucun texte en dur hors fichiers i18n).
 * Structure prête pour d'autres langues : dupliquer ce fichier et brancher
 * une sélection de langue quand le besoin arrivera.
 */
export const fr = {
  app: {
    name: 'Trackly',
    tagline: 'Ta bibliothèque de jeux, séries et films',
  },
  theme: {
    toLight: 'Passer en mode clair',
    toDark: 'Passer en mode sombre',
    light: '☀️ Clair',
    dark: '🌙 Sombre',
  },
  fields: {
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    newPassword: 'Nouveau mot de passe',
    displayName: 'Pseudo',
    rememberMe: 'Rester connecté',
  },
  auth: {
    loginTitle: 'Connexion',
    loginAction: 'Se connecter',
    loginPending: 'Connexion…',
    registerTitle: 'Créer un compte',
    registerAction: 'Créer mon compte',
    registerPending: 'Création…',
    logoutAction: 'Se déconnecter',
    forgotLink: 'Mot de passe oublié ?',
    noAccount: 'Pas encore de compte ?',
    registerLink: 'Inscris-toi',
    hasAccount: 'Déjà un compte ?',
    loginLink: 'Connecte-toi',
    forgotTitle: 'Mot de passe oublié',
    forgotHint:
      'Indique ton adresse e-mail : si un compte existe, tu recevras un lien de réinitialisation valable 1 heure.',
    forgotAction: 'Envoyer le lien',
    forgotPending: 'Envoi…',
    forgotDone:
      'Demande envoyée. Si un compte existe avec cette adresse, un e-mail est en route — pense à vérifier tes spams.',
    resetTitle: 'Nouveau mot de passe',
    resetAction: 'Changer le mot de passe',
    resetPending: 'Changement…',
    resetDone: 'Mot de passe changé. Tu peux te connecter.',
    resetMissingToken: 'Lien incomplet — ouvre le lien reçu par e-mail.',
    genericError: 'Une erreur est survenue. Réessaie dans un instant.',
  },
  passwordStrength: {
    label: 'Robustesse',
    levels: ['Trop court', 'Faible', 'Correct', 'Bon', 'Excellent'],
  },
  home: {
    welcome: 'Bonjour',
    lotDone: 'Lot 1 — comptes et sécurité : opérationnel.',
    nextUp: 'Prochaine étape : la recherche de jeux, films et séries (Lot 2).',
    apiChecking: "Vérification de l'API…",
    apiOk: 'API opérationnelle',
    apiDown: 'API injoignable',
  },
} as const;
