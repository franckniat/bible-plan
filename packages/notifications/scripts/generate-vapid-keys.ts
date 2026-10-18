// Generates the VAPID key pair that identifies the server to push services.
//
//   pnpm --filter @workspace/notifications push:keys
//
// Put the three lines it prints in apps/web/.env.local (and in the hosting
// environment). Keep the private key secret; changing the pair makes every
// subscription made with the old one stop working.
import { generateKeyPairSync } from "node:crypto"

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
})

const toBase64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url")

// Public key: the uncompressed point (0x04 || x || y, 65 bytes).
const publicJwk = publicKey.export({ format: "jwk" })
const point = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x!, "base64url"),
  Buffer.from(publicJwk.y!, "base64url"),
])
// Private key: the 32-byte scalar.
const privateJwk = privateKey.export({ format: "jwk" })

console.log(`VAPID_PUBLIC_KEY=${toBase64Url(point)}`)
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d!}`)
console.log("VAPID_SUBJECT=mailto:you@example.com")
