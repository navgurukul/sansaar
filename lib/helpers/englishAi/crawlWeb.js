const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const scrapeWebsite = async (url, targetSelector, titleSelector, urlSelector, imageSelector) => {
    const sourceName = url.includes('www.') ? url.split('://www.')[1].split('/')[0] : url.split('://')[1].split('/')[0];
    try {
        // Fetch HTML content from the provided URL
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Extract information based on provided selectors
        const articles = [];
        $(targetSelector).each((index, element) => {
            const title = $(element).find(titleSelector).text().trim();
            // console.log(title);
            const href = $(element).find(urlSelector).attr('href');
            // console.log(href);

            // Check if it's a valid URL and title
            if (href && (href.startsWith('/') || href.startsWith('http')) && title && title.length > 0) {
                let fullUrl = href;
                if (fullUrl.startsWith('/')) {
                    // Combine with the base URL
                    fullUrl = new URL(href, url).href;
                }
                // console.log(fullUrl)
                articles.push({ id: index + 1, title, source: fullUrl, image });
            }
        });

        // Create or load the existing JSON data
        const today = format(new Date(), 'doMMM');
        const fileName = `../outputs/${today}_article.json`;
        let jsonData = {};
        try {
            const fileContent = fs.readFileSync(fileName, 'utf-8');
            jsonData = JSON.parse(fileContent);
        } catch (error) {
            // Ignore if the file doesn't exist or cannot be read
        }

        // Update the JSON data with new information
        const id = Object.keys(jsonData).length + 1;
        jsonData[sourceName] = {
            id,
            url: url,
            articles: articles,
        };

        // Save updated data to the JSON file
        fs.writeFileSync(fileName, JSON.stringify(jsonData, null, 2));
        console.log(`Scraped data saved and updated to - ../outputs/${fileName}`);
    } catch (error) {
        console.error(`Error scraping ${url}: ${error.message}`);
    }
};


// Example usage with different selectors for different websites
const website1 = 'https://finshots.in/archive/';
scrapeWebsite(website1, '.post-card-content', '.post-card-title', '.post-card-content-link', '.post-card-image-link');

// const website2 = 'https://www.newsahoot.com/articles';
// scrapeWebsite(website2, '.articlesCard_articleCardItemMainDiv__p26dZ', '.articlesCard_articleCardItemMainDiv__p26dZ', '.');
