// Every product page, imported statically so Next.js can see the whole
// module graph (including client components inside the MDX). To add one,
// copy _template/ to a new folder and register it here; the key is its URL
// slug. See README.md for what goes in a product folder.
import * as claude from "./claude/index.mdx";
import * as linear from "./linear/index.mdx";
import * as superlogical from "./superlogical/index.mdx";

export const PRODUCTS = { superlogical, claude, linear };
