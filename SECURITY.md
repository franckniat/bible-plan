# Politique de sécurité

## Versions prises en charge

Le projet est en développement actif. Seule la branche `main` (et la version déployée qui en découle) reçoit des correctifs de sécurité.

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique** pour une faille de sécurité.

Utilisez le signalement privé de GitHub : onglet **Security** du dépôt → **Report a vulnerability**.

Merci d'indiquer :

- la description de la vulnérabilité et son impact ;
- les étapes pour la reproduire (preuve de concept si possible) ;
- les versions, commits ou URL concernés ;
- toute piste de correction.

## Ce à quoi vous pouvez vous attendre

- un accusé de réception sous **7 jours** ;
- une première évaluation sous **14 jours** ;
- une information régulière jusqu'à la correction ;
- une mention dans l'avis de sécurité publié, si vous le souhaitez.

Merci de laisser un délai raisonnable de correction avant toute divulgation publique.

## Périmètre

Sont notamment concernés : l'authentification et les sessions, l'accès aux données d'autres utilisateurs ou groupes (plans, journaux de prière, notes), l'endpoint de déclenchement des rappels (cron), les notifications push et la fuite de secrets.
