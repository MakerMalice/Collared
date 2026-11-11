/* collared.app/account: which Collared server this page signs in to.
   Both values are public by design: the URL is in every request the app makes, and the publishable key only opens what
   the database's own rules allow. NEVER put a service role key, a secret key or any other secret in this repo.
   Today real accounts live on the staging project (beta); when production exists this file switches with it, and so
   does the connect-src line in account.html's Content-Security-Policy. */
window.COLLARED_ACCOUNT = {
  url: "https://msuqgzmyzmfonfexzfyu.supabase.co",
  key: "sb_publishable_yWsFLTJlnSpzUH2qyl19pA_ZeXYUa9r",
  discord: "https://discord.gg/collared",
  beta: "/beta",
};
