# Putting Find the Crowd live on findthecrowd.com

Follow these in order. Every step says what to click and what to copy. If a step
fails, stop there rather than carrying on, because each one depends on the last.

Total time if nothing goes wrong: about 45 minutes.

Everything here is free at this stage. GitHub is free, Vercel is free for a
project this size, Supabase has a free tier that will carry you well past the
first few hundred users.

---

## What you need before you start

Three accounts. Make them all with the same email so you do not lose track.

1. A GitHub account. github.com, sign up.
2. A Vercel account. vercel.com, sign up, and choose "Continue with GitHub" so
   the two are linked from the start.
3. A Supabase account. supabase.com, sign up, again "Continue with GitHub".

You also need the login for wherever you bought findthecrowd.com. That is your
registrar. If you are not sure who it is, search your email for "findthecrowd"
and the receipt will name them.

---

## Step 1. Put the code on GitHub

Unpack the project folder somewhere you can find it, then open Terminal on Mac
and run these one at a time, from inside the folder.

```bash
cd path/to/findthecrowd
git init
git add .
git commit -m "Find the Crowd MVP"
```

Now make the remote repository.

1. Go to github.com and click the plus in the top right, then "New repository".
2. Name it `findthecrowd`.
3. Set it to Private.
4. Do not tick "Add a README". The project already has one.
5. Click "Create repository".

GitHub then shows you a page with commands on it. Use the two under "push an
existing repository", which look like this. Replace `YOURNAME` with your GitHub
username.

```bash
git remote add origin https://github.com/YOURNAME/findthecrowd.git
git branch -M main
git push -u origin main
```

If it asks for a password, GitHub does not accept your account password here.
Go to github.com, Settings, Developer settings, Personal access tokens, Tokens
(classic), Generate new token, tick `repo`, generate, and paste that token as
the password.

Refresh the GitHub page. Your files should be there.

---

## Step 2. Set up the database

1. Go to supabase.com and click "New project".
2. Name: `findthecrowd`. Region: East US (North Virginia), which is the
   closest one to Ottawa. Set a database password and save it somewhere.
3. Wait about two minutes for it to finish setting up.
4. In the left sidebar click "SQL Editor", then "New query".
5. Open `supabase/schema.sql` from the project folder, copy all of it, paste it
   into that box, and click "Run".
6. You should see "Success. No rows returned". That is correct. This creates the
   tables, the security rules and the anti-spam limits.

Now get the three keys.

1. Left sidebar, Project Settings, then "API".
2. Copy these three values into a note. You will paste them in the next step.
   - Project URL, looks like `https://abcdefgh.supabase.co`
   - anon public key, a long string starting `eyJ`
   - service_role key, also starting `eyJ`

The service role key can do anything to your database. Never put it in the code,
never paste it into a chat, never commit it. It only ever goes in the two places
named below.

---

## Step 3. Load the venues

Back in Terminal, in the project folder.

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill in three lines with the values you
just copied.

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`.env.local` is already in `.gitignore`, so it will not get pushed to GitHub.

Then run:

```bash
npm install
npm run seed
```

It should print that it seeded 41 venues and a couple of hundred events. Check
in Supabase under "Table Editor", "venues", and you should see them all.

---

## Step 4. Deploy to Vercel

1. Go to vercel.com and click "Add New", then "Project".
2. It shows your GitHub repositories. Find `findthecrowd` and click "Import".
3. Leave Framework Preset as Next.js and do not change the build settings.
4. Expand "Environment Variables" and add these four. Name on the left, value on
   the right, clicking "Add" after each.

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |
   | `NEXT_PUBLIC_SITE_URL` | `https://findthecrowd.com` |

   That last one matters more than it looks. It is what every page tells Google
   its real address is. Get it wrong and the site does not get indexed properly.

5. Click "Deploy" and wait about two minutes.

You will get a URL like `findthecrowd-xyz.vercel.app`. Open it. The site should
load with all the venues and no reports yet, because nobody has reported
anything. That is correct.

---

## Step 5. Point your domain at it

1. In Vercel, open your project, then Settings, then "Domains".
2. Type `findthecrowd.com` and click "Add".
3. Choose the option that also redirects `www.findthecrowd.com` to it.
4. Vercel now shows you the DNS records it needs. There will be two.

Now go to your registrar, find the DNS settings for findthecrowd.com, and add
exactly what Vercel showed you. It will be these two:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Use the values on your Vercel screen rather than the ones in this table if they
differ, because Vercel occasionally changes them.

If your registrar already has an A record on `@` pointing somewhere else, delete
that one first. Two A records on `@` will make the site load intermittently and
it is a horrible thing to debug.

DNS changes take anywhere from ten minutes to a few hours. Vercel's Domains page
shows a green tick when it is working, and it sorts out the HTTPS certificate on
its own. You do not need to do anything for that.

---

## Step 6. Tell Google the site exists

Nothing here matters until people can find it.

1. Go to search.google.com/search-console.
2. Click "Add property" and choose Domain, not URL prefix.
3. Enter `findthecrowd.com`.
4. It gives you a TXT record. Add that at your registrar the same way you added
   the others, then come back and click "Verify".
5. Once verified, go to "Sitemaps" in the left sidebar and submit:
   `https://findthecrowd.com/sitemap.xml`

That tells Google about all 54 pages at once instead of waiting for it to find
them. Indexing takes a few days to a few weeks. The guide pages are the ones
that will bring people in, so watch those in the Performance tab.

Also worth doing on day one:

- Google Business Profile is not relevant, you are not a physical business.
- Bing Webmaster Tools takes two minutes and you can import straight from Search
  Console. Bing is small but free.

---

## How to change things after this

The whole flow from now on is:

```bash
git add .
git commit -m "say what you changed"
git push
```

Vercel sees the push and deploys it automatically in about two minutes. There is
no separate deploy step ever again.

To add a venue, edit `src/data/venues.ts`, then run `npm run seed` locally to
push it to Supabase, then commit and push.

To add or edit a guide, edit `src/data/guides.ts` and push. The tests will fail
the build if a guide names a venue that does not exist, which is deliberate.

To check your work before pushing:

```bash
npm test          # runs the scoring and data tests
npm run build     # catches type errors and broken pages
```

---

## Things that will go wrong, and what they mean

The site shows venues but every score says no reports. Correct. Nobody has
reported anything yet. The demo data only runs when there is no database
connected, and you have one connected now.

A report fails with "cooldown". The database is refusing a second report on
the same venue from the same device inside 20 minutes. That is the anti-spam
rule working. Use a different device or wait.

Vercel build fails with a type error. Run `npm run build` locally and it will
show you the same error with more detail. Fix it, push again.

The domain says "Invalid Configuration" in Vercel. The DNS records have not
propagated yet, or there is an old A record on `@` still there. Wait an hour, and
if it persists, delete every A record on `@` except Vercel's.

Google has not indexed anything after a week. Check that
`NEXT_PUBLIC_SITE_URL` in Vercel is exactly `https://findthecrowd.com` with no
trailing slash. Then view source on your homepage and confirm the canonical tag
points at findthecrowd.com and not a vercel.app address.

---

## Before you tell anyone about it

The score needs four reports on a venue in six hours before it stops saying
"low signal". An empty site teaches the first visitor that the site is empty and
they do not come back.

So pick ten venues in the ByWard Market, pick one Friday, and go and report them
yourself over the course of the night. Get three or four friends to do the same.
That is the cold start, and there is no technical solution to it.
