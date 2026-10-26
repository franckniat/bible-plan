# Repositories

The only code that reads or writes the local database (`@/db/client`):
screens use the hooks and functions exported here. A lint rule keeps it so.

Each write of a synced record goes through `writeSynced` (`write.ts`): the
change and its outbox entry are stored in one transaction, then the screens
reading the table refresh (`notifyChange`).
