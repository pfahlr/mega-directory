# Development Phase 1 part B

The initial 20 codex tasks have been completed, and this has provided a solid base for the project. However, the project still falls short of a fully functioning application with all of the necessary moving parts. I'm sure this is because I failed to flesh out all of the details regarding the various workflows as I was particulary focused on the architecture. No problem, because this architecture is exactly what will make all of the remaining added functionality possible. 

We need to plan out some further development additions and refinements. It appears the api is missing a number of operations, but it seems the important base functionality is there so it shouldn't be a huge problem. I wanted to rethink some of the ways things work. Let's first of all think about the structure of the data. 

## Directory Pages

Rather than automatically generating directories from categories and locations, which could get messy if we try to have the system create all the permutations, furthermore, there will be significant SEO infomation that must be provided when creating a single directory page. So, we'll need a table to represent the individual directory pages. This way we can create directories that perhaps present more than one category or more than one postal code or city when these groupings represent very small amounts of listings or for whatever reason it makes sense to group or not group these together. The directory page can have its own title to concatenate with the site name to generate the content for the <title> tag and meta title, it can have an editable field for meta keywords, a field where the admin can specify the specific subdomain and the subdirectory used to represent the directory (based on the site configuration either the subdomain will 301 redirect to the subdirectory or the subdirectory to the subdomain, either way it should be possible for the admin to supply independent values for each of these), further meta tag values should include the description, og:image, etc. While the main site configuration should provide default values for these, it is important that it be possible to override them on individual directories.

It should also be a configuration option of the directory page whether the directory page should be location agnostic or not. If the directory page is NOT location agnostic, it should be relatively easy to provide a map widget displaying pins for each of the listings on the page. The user interface for this type of page could also include a pin icon at the end of the listing title that when clicked will cause the map widget to center on that listing. 

## Listing Locations and other Geographic Data

### Listing and physical_address tables

While we will be collecting a bunch of listings which are associated with various categories and locations. For some listings it may actually make sense to associate them with more than one category. It may even make sense to associate some listings with multiple addresses, but addresses should be associated only with a single listing (1234 some st. suite 1 and 1234 some st. suite 2 are separate addresses) So the *physical_address* table should have a foreign key on the *listing* table while listings and categories should be related via a join table.


### Country -> State/Province -> City -> Postal Data Structure

First of all there are *Categories* and *Locations*, Locations should be represented by a postal code. Each postal code should have a foreign key reference to a city (we'll call it that even though the exact what may vary), each city should have a foreign key reference to a state/province for countries that have these, alternatively they should have a foreign key reference directly to their country. (it may make sense to give countries with no state/province divisions a single state/province entry that just duplicates the country otherwise the city table will need foreign keys for both state/province and country), each state/province should have a foreign key reference to the country it is a part of. Each listing should have a foreign key reference to its zip/postal code entry... so, in the end we have a set of tables with this relationship, which can be found online, prepopulated here: https://github.com/dr5hn/countries-states-cities-database/tree/master/psql


```ascii
*zip/postal* --FK--> *city* --FK--> *state/province* --FK--> *country*
  |----------------FK---------------------^                
```

The zip/postal code relationships can be completed from the following data source: https://download.geonames.org/export/zip/

however 40 countries do no use a zip/postal code system... so we will have another special case similar to countries that do no have states/provinces... listings will need fields for 2 foreign keys zip_postal and city. Just as cities may need 2 foreign keys state_province and country. The country table should store the information regarding how its regions are structured as data drilldown usually begins here, we can get this information to conditionally structure queries depending on which country for which we are displaying/storing/editing listings. I am open to reccommendations for clean ways of managing this here. 


### Listings Geographic Data
Not all listings will be tied to a specific location... buisinessess and organizations that operate purely over the internet may not list an address, and it may just not make any sense for us to use one in our data presentation to begin with. If an address is available, we should probably store it, but for certain categories, we can probably treat all of the listings as location agnostic. But let's leave that to be determined by the directory configuration. Each listing should have a latitude and longitude value, this should be obtainable from the google maps api or some other such service. A quick google search turns up: MapQuest API, Geocodio, geocode.maps.co, locationIQ. 

## API Endpoints per these changes

We shouldn't need api endpoints to add/edit/delete values for the postal code, city, state/province, or country tables since these will be populated and stay fixed in the long term. But we will need add edit and delete functions for all of the following entities: listings, physical_addresses, categories, directory pages


---

## Crawler / Data colletion changes

It may not work well to automatically crawl the web for listings, and it may make a lot more sense if it were possible to provide listing data manually gathered from around the web. What would make this very easy to manage is if there were a very robust means of parsing through such data from a wide variety of sources. Beautiful soup scripts should be able to handle the most common sources of html data. And some data may come in the form of a csv, or a json array for which we arrive at a standardized formatting. But there should also be an option for parsing particulary messy data that it be sent through an inexpensive LLM endpoint. Maybe a gpt-4 or one of the free models available from openrouter. Those models may not be particulary effective at reasoning or coding, but they can certainly identify urls, titles, descriptions, addresses and other such data among large blocks of text in varied formats. In addition to the crawler scripts, we need to generate another one that accepts a path to a text file as an argument or reads from standard in, html crawlable by beautiful soup, serialized data like json, or raw unformatted text to be parsed by an llm (defaulting to one of the free openrouter models) there should be an argument to the script where the format of the input is specified as such. Any code that currently exists to generate short and long descriptions or other post parsing of the individual fields should be moved into a separate module that can be shared between the crawler and this new data collection method script.


---

## User Accounts (Phase 2)

I was thinking things over and I think it might be a good idea, maybe as a phase 2, and not until we have everything else working, but I would like to allow for the creation of user accounts. This would allow some interesting functionality that could encourage users to share links to our directories generating significant organic traffic. I envision a user creation system similar to reddit where upon using a function of the site requiring a login, the site should automatically generate an account stub, offering the user a unique token and automatically generated username they can store and use to restore their session the next time they visit the site. Along with the presentation of the token, the user should also be given the option to optionally supply their own username, email address, and password. Users who supply only an email will be assigned the generated username, if they supply a username that username will be assigned and they will be able to login at a later date by entering either their email address or their username, this will bring them to a form where they can enter a code which will be sent to their email address at each login. Once logged in, these users will be able to create a password from the admin panel at any time in the future. Users who supply a password will be able to login using their email or username / password pair on their next visit. I think this workflow overcomes many of the psychological barriers to joining websites since there are so many different ways to end up with an account. None requiring all of the steps be completed at once like traditional website registration.

### User functionality 

#### Collections

Listings could have an *add to list* function. I envision a small icon that when clicked expands a box with a list of the lists created by the user and a textfield/button at the end to create a new list. Using async ajax type interaction the user could click a toggle button before one or more of the lists in the box and or enter the name of a new list and hit the button to add the listing to a new list. The toggles prior to the list names should display + or - depending on whether the item is already in that list or not and clicking on a - should remove the listing. Using these lists, users could create sharable collections of links at https://example.com/[username]/[list_name], for listings associated with addresses these pages could have buttons to download csv, kml, or other gps files containing their collections. 

#### Vote Up/Down 
Users could provide feedback on listings by providing up/down votes

#### Reviews
Users could provide reviews, possibly even with photo uploads, or even just add photos to listings

#### Report Dead / Nonexistent Listings
Users could file reports for listings that no longer have an associated business or organization.


---

Please let me know immediately what, if any of this is vague or unclear. I want to be able to generate a list of codex tasks that will result in this functionality getting built without missing any important components necessary to make this work. 
                                            
---               

## Directory Pages: Should a directory page be able to display listings across multiple unrelated categories (e.g. "Jobs" and "Real Estate" together)?

- yes

## Should directory pages be manually created only, or should the crawler ever propose new directory pages for review?

- manually only at this time

## Location Structure:

### Do you want to preload the full countries/states/cities/postal database into your app's DB (e.g., via a migration or one-time script)?
   
- yes

### Should postal-less countries (or cities without zips) simply use "city-only" fallback, or do you want a distinct field/type for these cases?

- city only 

## Geocoding:     
  
### Should geolocation be triggered automatically after a listing with address is saved, or should it be manual/admin-triggered?

- Automatic
    
### Preferred fallback or order of geocoding services (e.g., geocode.maps.co -> MapQuest -> Google)?
    
- Let's primarily use geocode.maps.co and fallback on Google Maps Geocode API, omit mapquest since they require a payment method. 
  I've created entries for environment variables as GEOCODEMAPS_API_KEY, and GOOGLEMAPS_API_KEY in env.json which just needs to have the Makefile operations run on it to generate the encrypted version and the sops command to load a shell with all the values from that file converted to environment variables. have a look at the Makefile I created it will make sense how that all works and how to get the secrets into environment variables. 

## User Accounts: 

### Will users be able to manage listings (e.g., "claim" a listing or create their own)? Or just interact (collections, voting, etc)?
 
 - Let's leave it open ended if we'll provide a buiness owner listing management feature yet. Don't paint us in a corner so that we can't add it later, but I don't want to spec this at this time... I want to section off all of the *user* development tasks to happen after we get everything else working as it is. But, yes, I suspect we'll want to let users claim and / or create listings and be able to rent featured placement, by the day, week, or month. 

### Should login with magic email link (no password) always be an option, or only for users who don’t opt in to passwords?

 - This should always be an option... at least until we implement 2fa for accounts with passwords (probably phase 3)
    
## Data Collection Script: Should this script write directly to the database/API, or output standardized JSON files to be reviewed/imported separately?

 - hmm, good point, that's not a bad idea. Data import in this fashion should occur in two steps. 
 
 1) beautiful soup parsed html, or llm parsed html or other mixed content  ---> basic data json file
 
 2) basic data json file ---> generated short/long description, title improvements, determination of subcategory / alternate categories by free openrouter llm models ---> insert into database via api
    
 ---
 
## Subdomain vs Subdirectory: The spec allows both a subdomain and a subdirectory for a directory page. Clarify the desired behavior (e.g. should one always redirect to the other?). Implementation could simply enforce a canonical structure, but decide whether the primary path is the subdomain or the directory URL.
 - There should be a configuration option on the astro site that determines if the directories will be referenced by either subdomain or subdirectory. If subdomain is selected then when an http request for the corresponding subdirectory is made, the server should issue a redirect to the subdomain. If subdirectory is selected, the opposite should occcur. 


## Postal-Code and City Fallback: The approach for cities without postal codes is “city-only”. Confirm: will listings in such countries have postal_code_id = NULL and rely solely on city_id? How to query/filter these listings versus postal-coded listings? Ensure the schema allows queries like “all listings in city X” covering both cases.

 - Yes in countries where there is no postal code, we will use city as in "all listings in city x"


## Multiple Addresses: If a listing has multiple addresses, should all be displayed on the listing detail page, and should the listing appear under each relevant location-based directory page? (Likely yes.) Plan how to handle multiple map pins for one listing if needed.

 - Listings with multiple addresses should appear once for each address on non-location agnostic directories, and only once for location agnostic directories

## LLM Prompts and Limits: Defining the prompts for raw text parsing and enrichment will require iteration. Also consider rate limits or token limits (e.g. breaking very long HTML into pieces).
  
  - yes!

## Environment Setup: Ensure the build system (Makefile/SOPS) loads the new GEOCODEMAPS_API_KEY and GOOGLEMAPS_API_KEY variables correctly. This is part of dev setup but should be tested.

 - I was just configuring this.

---

## Consolidated Development Plan

Great — I’ll generate a full Codex task set (around 20 tasks) based on the complete updated functionality we’ve outlined, including all aspects from directory pages and geographic structuring to crawler design, admin review flow, and phased-in user accounts.

I’ll let you know as soon as the full task set is ready. You can continue working or chatting in the meantime.




