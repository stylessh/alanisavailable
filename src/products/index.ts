// Every product page, imported statically so Next.js can see the whole
// module graph (including client components inside the MDX). To add one,
// copy _template.mdx and register it here; the key is its URL slug.
import * as claude from "./claude.mdx";
import * as linear from "./linear.mdx";
import * as ramp from "./ramp.mdx";
import * as superlogical from "./superlogical.mdx";
import * as vercel from "./vercel.mdx";

export const PRODUCTS = { ramp, claude, linear, vercel, superlogical };
