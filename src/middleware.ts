export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Protect the root Kanban board workspace.
     * Public pages (/about, /terms, etc.) and SEO files (/sitemap.xml, /robots.txt)
     * are left unblocked so Google crawlers can index them.
     */
    '/',
  ],
}