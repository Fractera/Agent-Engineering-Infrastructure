The "welcome" runtime page — the born demo of the rebuild-free page loop (step 254.17).
Compile it: POST /api/projects/pages/compile {"automation":"other/test-stream-frozen-starter","page":"welcome"}
Open it:    /projects/other/test-stream-frozen-starter/p?name=welcome
Edit pages/welcome/page.tsx, compile again — the change is live instantly. The dependency contract is in
PLATFORM.md / the compile error text: self-contained async server component, no imports.
