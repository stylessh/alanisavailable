// The theme's storage key and the boot script, apart from theme.ts's hooks
// so the server-rendered page can inline the script.
export const THEME_KEY = "pl-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Run inline at the top of .polar, before the dashboard paints, so a dark
 * page never flashes light first. Mirrors resolve() in theme.ts.
 */
export const THEME_SCRIPT = `(function(){var e=document.currentScript.parentElement,t;try{t=localStorage.getItem("${THEME_KEY}")}catch(_){}if(t!=="light"&&t!=="dark")t=matchMedia("${DARK_QUERY}").matches?"dark":"light";e.setAttribute("data-theme",t)})()`;
