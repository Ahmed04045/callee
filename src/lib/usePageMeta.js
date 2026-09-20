// src/lib/usePageMeta.js
//
// Per-page <title> and meta description (the basics search engines and link
// previews read). Restores the previous values when the page unmounts.
// Note: crawlers that don't run JavaScript still see the defaults in
// index.html, which describe the whole site.

import { useEffect } from 'react';

const SUFFIX = 'Circosodal';

export default function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    const tag = document.querySelector('meta[name="description"]');
    const prevDescription = tag?.getAttribute('content');

    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    if (tag && description) tag.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      if (tag && prevDescription != null) tag.setAttribute('content', prevDescription);
    };
  }, [title, description]);
}
