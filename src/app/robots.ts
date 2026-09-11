import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://kanban-cloud-685823552970.asia-south1.run.app/sitemap.xml',
  }
}
