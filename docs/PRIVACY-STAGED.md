# Privacy policy: staged additions

Blocks drafted by the app project on 2026-09-23 for features that are **not live yet**. Paste
each into `privacy.html` under the suggested heading in the same commit that ships the
feature, bump the "Effective" date, and update `docs/10-STORE-PRIVACY.md` in the app repo at
the same time (the two must move together).

Block 1 of that draft (messages between friends, build 25) is already live on the page under
"Who can see what" as of 23 September 2026.

## 2. Social: what other members can see  → new list item(s) under "Who can see what"

Collared has a Social area. Other members see only what you choose to share with them. Journal
entries are private unless you pick an audience for each one: your dynamic, your friends,
specific people, or Everyone. A post you share with Everyone can be read by any Collared member,
under your name and username, until you take it back.

When you join a community challenge, other members see only a count of how many people joined.
Your friends can see your face on it, and you can turn that off.

## 3. Being found, and your region  → replaces the "Everyone else sees nothing… never by browsing" bullet under "Who can see what"

You can choose to let people find you. If you turn this on, Collared may suggest you to other
members who also turned it on, based on what you said you are here for, Discord rooms you
share, and whether you have interacted before. You can also choose to share a broad region,
such as "Northeast". Collared never uses your exact location, your city, your distance from
anyone, or your contacts for suggestions.

People can search for you by username, and by email or linked Discord account only if your
privacy settings allow it.

> Note: this contradicts two current lines ("never by email" under Who can see what, and
> "We never look up people by email" under What we never do). Rewrite both when this ships.

## 4. Who is here  → new list item under "What we store" (activity ping) + a line under "Who can see what"

Social shows an approximate count of members active in the app, rounded, never naming anyone.
To produce it, Collared records that your account was active in the last few minutes. You can
opt out of being counted. Friends can see a dot while you are active only if you choose to
show it.

## 5. Discord  → new section "Discord", before "Adults only"

Collared runs a public Discord server. Replies posted in its public channels may be summarised
by AI and quoted inside the Collared app. If your Discord account is linked to Collared, your
Discord name may appear with a quote. If it is not linked, your quote appears without a name.
We keep the Discord identity of people we quote so we can attribute or remove their words
later, including people who do not use Collared. To have a quote removed, delete the message in
Discord or contact us.

## 6. Reports and moderation  → new section "Reports and moderation", after "Who can see what"

Messages are end to end encrypted and we cannot read them. Posts you share with Everyone are
different: if someone reports one, a member of the Collared team reads that post to decide what
to do. We check posts shared with Everyone against a list of blocked words before they publish.

> Note: the "What we never do" section says "no automated processing of any kind" about
> journal text; the blocked-words check applies only to Everyone posts, so keep the two
> statements clearly separated when this ships.
