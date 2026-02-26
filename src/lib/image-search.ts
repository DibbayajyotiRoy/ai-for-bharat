export interface TopicImage {
    url: string;
    alt: string;
    photographer: string;
    photographerUrl: string;
    source: string;
}

export async function searchImages(keywords: string[]): Promise<TopicImage[]> {
    const query = keywords.join(' ');
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
        console.warn('[ImageSearch] UNSPLASH_ACCESS_KEY not set. Using placeholders.');
        return getPlaceholderImages(keywords);
    }

    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`,
            {
                headers: {
                    Authorization: `Client-ID ${accessKey}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Unsplash returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return getPlaceholderImages(keywords);
        }

        return data.results.map((r: any) => ({
            url: r.urls.regular,
            alt: r.alt_description || r.description || query,
            photographer: r.user.name,
            photographerUrl: r.user.links.html,
            source: 'Unsplash',
        }));
    } catch (error: any) {
        console.error('[ImageSearch] Fetch failed:', error.message);
        return getPlaceholderImages(keywords);
    }
}

function getPlaceholderImages(keywords: string[]): TopicImage[] {
    // Using high-quality placeholder images for demo if no key
    // These use Unsplash source links which don't require a key
    return [
        {
            url: `https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=800`,
            alt: `Visual for ${keywords[0] || 'Topic'}`,
            photographer: 'Unsplash Contributor',
            photographerUrl: 'https://unsplash.com',
            source: 'Unsplash',
        },
        {
            url: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800`,
            alt: `Visual for ${keywords[1] || keywords[0] || 'Topic'}`,
            photographer: 'Unsplash Contributor',
            photographerUrl: 'https://unsplash.com',
            source: 'Unsplash',
        }
    ];
}
