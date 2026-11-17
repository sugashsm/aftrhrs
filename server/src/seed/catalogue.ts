/**
 * Curated sample catalogue. Metadata only (title, artist, album, year, genre, language) plus
 * AFTRHRS editorial tags (energy 1-5, popularity 0-100, mood codes). No audio is stored.
 *
 * Format: title | artist | album | year | genre | language | energy | popularity | moods
 */
export const MOOD_CODES: Record<string, string> = {
  nos: 'Nostalgic', mel: 'Melancholic', pea: 'Peaceful', eup: 'Euphoric', hbr: 'Heartbroken', rom: 'Romantic',
  dre: 'Dreamy', con: 'Confident', lon: 'Lonely', mc: 'Main Character', res: 'Restless', hop: 'Hopeful',
  ln: 'Late Night', unb: 'Unbothered', fre: 'Freedom', los: 'Lost', ins: 'Inspired', pch: 'Peaceful Chaos',
};

export const EMERGING_ARTISTS = ['Sai Abhyankkar', 'Anuv Jain', 'Clairo', 'Petit Biscuit', 'Dhee ft. Arivu', 'The Local Train', 'Ritviz', 'Jon Hopkins', 'Prateek Kuhad', 'Hesham Abdul Wahab', 'Ram Miriyala', 'Chappell Roan', 'Peter Bjorn and John', 'Shahabaz Aman'];

export const CATALOGUE = `
Somewhere Only We Know|Keane|Hopes and Fears|2004|alternative|English|3|92|nos,mel,hop
Midnight City|M83|Hurry Up, We're Dreaming|2011|electronic|English|4|88|fre,eup,ln,mc
Sweater Weather|The Neighbourhood|I Love You.|2013|alternative|English|3|95|mc,rom,ln
The Night We Met|Lord Huron|Strange Trails|2015|indie|English|2|93|ln,nos,hbr,lon
A Sky Full of Stars|Coldplay|Ghost Stories|2014|pop|English|5|94|hop,eup,rom
Fix You|Coldplay|X&Y|2005|alternative|English|2|93|hop,mel,hbr
Yellow|Coldplay|Parachutes|2000|alternative|English|3|92|rom,nos,dre
The Scientist|Coldplay|A Rush of Blood to the Head|2002|alternative|English|2|93|hbr,mel,nos
Space Song|Beach House|Depression Cherry|2015|indie|English|2|90|dre,mel,ln
Myth|Beach House|Bloom|2012|indie|English|3|78|dre,los
Apocalypse|Cigarettes After Sex|Cigarettes After Sex|2017|indie|English|1|91|rom,ln,dre
K.|Cigarettes After Sex|Cigarettes After Sex|2017|indie|English|1|85|rom,ln,lon
Motion Sickness|Phoebe Bridgers|Stranger in the Alps|2017|indie|English|3|82|hbr,res,unb
Scott Street|Phoebe Bridgers|Stranger in the Alps|2017|indie|English|2|80|nos,lon,mel
Kyoto|Phoebe Bridgers|Punisher|2020|indie|English|4|83|pch,nos,res
Liability|Lorde|Melodrama|2017|pop|English|1|83|lon,mel,hbr
Ribs|Lorde|Pure Heroine|2013|pop|English|4|88|nos,res,mc
Supercut|Lorde|Melodrama|2017|pop|English|4|80|nos,eup,hbr
Pink + White|Frank Ocean|Blonde|2016|R&B|English|3|92|pea,nos,dre
Nights|Frank Ocean|Blonde|2016|R&B|English|3|90|ln,res,los
Self Control|Frank Ocean|Blonde|2016|R&B|English|2|85|hbr,nos,mel
Ivy|Frank Ocean|Blonde|2016|R&B|English|2|88|nos,hbr
Thinkin Bout You|Frank Ocean|channel ORANGE|2012|R&B|English|2|89|rom,lon,ln
Good Days|SZA|SOS|2020|R&B|English|3|90|hop,pea,dre
Snooze|SZA|SOS|2022|R&B|English|3|92|rom,unb
Die For You|The Weeknd|Starboy|2016|R&B|English|3|95|rom,ln,hbr
After Hours|The Weeknd|After Hours|2020|R&B|English|3|88|ln,lon,res
Blinding Lights|The Weeknd|After Hours|2019|pop|English|5|98|eup,fre,ln,mc
Get You|Daniel Caesar|Freudian|2017|R&B|English|2|89|rom,pea
Best Part|Daniel Caesar|Freudian|2017|R&B|English|2|91|rom,pea
Come Through and Chill|Miguel|War & Leisure|2017|R&B|English|2|76|ln,rom,unb
Redbone|Childish Gambino|Awaken, My Love!|2016|R&B|English|3|93|ln,con,res
The Less I Know the Better|Tame Impala|Currents|2015|indie|English|4|95|hbr,mc,res
Let It Happen|Tame Impala|Currents|2015|electronic|English|4|88|fre,pch,ins
New Person, Same Old Mistakes|Tame Impala|Currents|2015|indie|English|3|84|con,dre,pch
Do I Wanna Know?|Arctic Monkeys|AM|2013|rock|English|3|96|ln,res,rom
505|Arctic Monkeys|Favourite Worst Nightmare|2007|rock|English|4|93|nos,hbr,res
There Is a Light That Never Goes Out|The Smiths|The Queen Is Dead|1986|alternative|English|3|88|rom,lon,nos
Dreams|Fleetwood Mac|Rumours|1977|rock|English|3|95|dre,unb,fre
Landslide|Fleetwood Mac|Fleetwood Mac|1975|rock|English|1|90|nos,mel,pea
Heroes|David Bowie|Heroes|1977|rock|English|4|90|ins,hop,mc
Under Pressure|Queen & David Bowie|Hot Space|1982|rock|English|4|93|pch,ins
Everybody Wants to Rule the World|Tears for Fears|Songs from the Big Chair|1985|pop|English|4|94|fre,nos,mc
Running Up That Hill (A Deal with God)|Kate Bush|Hounds of Love|1985|pop|English|4|93|res,ins,mc
Just Like Heaven|The Cure|Kiss Me, Kiss Me, Kiss Me|1987|alternative|English|4|89|rom,eup,nos
Fade Into You|Mazzy Star|So Tonight That I Might See|1993|alternative|English|1|91|dre,lon,rom
Creep|Radiohead|Pablo Honey|1993|alternative|English|3|96|lon,los,mel
No Surprises|Radiohead|OK Computer|1997|alternative|English|2|92|mel,pea,los
Weird Fishes/Arpeggi|Radiohead|In Rainbows|2007|alternative|English|3|85|los,dre,pch
Holocene|Bon Iver|Bon Iver|2011|indie|English|1|84|pea,los,ins
Skinny Love|Bon Iver|For Emma, Forever Ago|2007|indie|English|2|90|hbr,mel,lon
Re: Stacks|Bon Iver|For Emma, Forever Ago|2007|indie|English|1|78|pea,mel,hop
First Day of My Life|Bright Eyes|I'm Wide Awake, It's Morning|2005|indie|English|2|83|rom,hop,pea
Such Great Heights|The Postal Service|Give Up|2003|electronic|English|4|84|rom,eup,nos
Young Folks|Peter Bjorn and John|Writer's Block|2006|indie|English|4|85|unb,nos
Electric Feel|MGMT|Oracular Spectacular|2007|indie|English|4|92|eup,con,fre
Kids|MGMT|Oracular Spectacular|2007|indie|English|5|93|nos,eup,fre
Tongue Tied|Grouplove|Never Trust a Happy Song|2011|indie|English|5|88|eup,fre,nos
Dog Days Are Over|Florence + The Machine|Lungs|2008|indie|English|5|92|eup,fre,hop
Shake It Out|Florence + The Machine|Ceremonials|2011|indie|English|4|85|hop,ins
Cherry Wine|Hozier|Hozier|2014|indie|English|1|84|rom,mel
Work Song|Hozier|Hozier|2014|indie|English|2|88|rom,ln
Bags|Clairo|Immunity|2019|indie|English|3|86|rom,res,dre
Pretty Girl|Clairo|diary 001|2017|indie|English|3|80|unb,con
Glimpse of Us|Joji|SMITHEREENS|2022|pop|English|1|93|hbr,nos,mel
Slow Dancing in the Dark|Joji|BALLADS 1|2018|R&B|English|2|92|ln,lon,hbr
Heat Waves|Glass Animals|Dreamland|2020|indie|English|3|97|nos,ln,hbr
Sunflower, Vol. 6|Harry Styles|Fine Line|2019|pop|English|3|78|pea,rom,unb
As It Was|Harry Styles|Harry's House|2022|pop|English|4|98|nos,mc,pch
august|Taylor Swift|folklore|2020|pop|English|3|92|nos,rom,dre
cardigan|Taylor Swift|folklore|2020|pop|English|2|93|nos,hbr,mel
Cruel Summer|Taylor Swift|Lover|2019|pop|English|5|98|eup,rom,mc
good 4 u|Olivia Rodrigo|SOUR|2021|pop|English|5|95|con,hbr,unb
drivers license|Olivia Rodrigo|SOUR|2021|pop|English|2|95|hbr,lon
bad idea right?|Olivia Rodrigo|GUTS|2023|pop|English|5|85|pch,unb,con
BIRDS OF A FEATHER|Billie Eilish|HIT ME HARD AND SOFT|2024|pop|English|3|98|rom,hop,dre
when the party's over|Billie Eilish|WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?|2018|pop|English|1|93|lon,hbr,ln
Espresso|Sabrina Carpenter|Short n' Sweet|2024|pop|English|4|98|con,unb
Good Luck, Babe!|Chappell Roan|Good Luck, Babe!|2024|pop|English|4|96|con,hbr,mc
Levitating|Dua Lipa|Future Nostalgia|2020|pop|English|5|96|eup,con
HUMBLE.|Kendrick Lamar|DAMN.|2017|hip-hop|English|5|96|con,unb
Money Trees|Kendrick Lamar|good kid, m.A.A.d city|2012|hip-hop|English|3|93|ln,nos,unb
LOVE.|Kendrick Lamar|DAMN.|2017|hip-hop|English|3|90|rom,unb
Sunflower|Post Malone & Swae Lee|Spider-Man: Into the Spider-Verse|2018|hip-hop|English|4|97|unb,fre,mc
See You Again|Tyler, The Creator|Flower Boy|2017|hip-hop|English|3|95|dre,rom
EARFQUAKE|Tyler, The Creator|IGOR|2019|hip-hop|English|3|93|hbr,res
Passionfruit|Drake|More Life|2017|hip-hop|English|3|93|ln,unb,lon
Self Care|Mac Miller|Swimming|2018|hip-hop|English|3|90|los,hop,unb
Good News|Mac Miller|Circles|2020|hip-hop|English|2|88|mel,hop,pea
Strobe|deadmau5|For Lack of a Better Name|2009|electronic|Instrumental|4|84|ins,eup,ln
Innerbloom|RÜFÜS DU SOL|Bloom|2016|electronic|English|3|86|ln,dre,eup
Intro|The xx|xx|2009|indie|Instrumental|3|90|mc,ln,con
Teardrop|Massive Attack|Mezzanine|1998|electronic|English|2|88|ln,dre,los
Instant Crush|Daft Punk|Random Access Memories|2013|electronic|English|3|90|nos,hbr,ln
Something About Us|Daft Punk|Discovery|2001|electronic|English|2|86|rom,ln
Sunset Lover|Petit Biscuit|Petit Biscuit|2015|electronic|Instrumental|3|88|pea,fre,dre
Open Eye Signal|Jon Hopkins|Immunity|2013|electronic|Instrumental|4|70|res,ins,pch
Avril 14th|Aphex Twin|Drukqs|2001|electronic|Instrumental|1|85|pea,mel,nos
Clair de Lune|Claude Debussy|Suite bergamasque|1905|classical|Instrumental|1|92|pea,dre,nos
Gymnopédie No. 1|Erik Satie|Trois Gymnopédies|1888|classical|Instrumental|1|90|pea,mel,lon
Experience|Ludovico Einaudi|In a Time Lapse|2013|classical|Instrumental|3|90|ins,mc,hop
Nuvole Bianche|Ludovico Einaudi|Una Mattina|2004|classical|Instrumental|2|89|pea,hop,mel
On the Nature of Daylight|Max Richter|The Blue Notebooks|2004|classical|Instrumental|1|86|mel,hbr,los
Time|Hans Zimmer|Inception|2010|classical|Instrumental|3|92|ins,mc,pch
Blue in Green|Miles Davis|Kind of Blue|1959|jazz|Instrumental|1|85|ln,mel,pea
Take Five|The Dave Brubeck Quartet|Time Out|1959|jazz|Instrumental|3|90|unb,con
My Funny Valentine|Chet Baker|Chet Baker Sings|1954|jazz|English|1|84|rom,lon,ln
Feeling Good|Nina Simone|I Put a Spell on You|1965|jazz|English|3|93|con,fre,hop
In a Sentimental Mood|Duke Ellington & John Coltrane|Duke Ellington & John Coltrane|1963|jazz|Instrumental|1|84|rom,ln,nos
Don't Know Why|Norah Jones|Come Away with Me|2002|jazz|English|2|90|pea,mel,lon
Munbe Vaa|A.R. Rahman, Shreya Ghoshal & Naresh Iyer|Sillunu Oru Kaadhal|2006|film|Tamil|2|93|rom,nos,pea
New York Nagaram|A.R. Rahman|Sillunu Oru Kaadhal|2006|film|Tamil|2|90|lon,nos,ln
Kannazhaga|Dhanush & Shruti Haasan|3|2011|film|Tamil|2|88|rom,dre
Why This Kolaveri Di|Dhanush & Anirudh Ravichander|3|2011|film|Tamil|3|95|hbr,unb
Po Nee Po|Anirudh Ravichander & Mohit Chauhan|3|2011|film|Tamil|2|86|hbr,lon,mel
Nenjukkul Peidhidum|Harris Jayaraj & Hariharan|Vaaranam Aayiram|2008|film|Tamil|3|92|rom,dre,nos
Mundhinam Paarthene|Harris Jayaraj, Naresh Iyer & Prashanthini|Vaaranam Aayiram|2008|film|Tamil|3|90|rom,nos
Vaseegara|Harris Jayaraj & Bombay Jayashri|Minnale|2001|film|Tamil|2|91|rom,pea,nos
Unakkul Naane|Harris Jayaraj & Bombay Jayashri|Pachaikili Muthucharam|2007|film|Tamil|2|80|ln,rom,dre
Ennodu Nee Irundhaal|A.R. Rahman & Sid Sriram|I|2015|film|Tamil|2|88|rom,hbr
Thalli Pogathey|A.R. Rahman & Sid Sriram|Achcham Yenbadhu Madamaiyada|2016|film|Tamil|3|92|rom,res,mc
Maruvaarthai|Darbuka Siva & Sid Sriram|Enai Noki Paayum Thota|2017|film|Tamil|2|90|rom,dre,lon
Kaathalae Kaathalae|Govind Vasantha & Chinmayi|96|2018|film|Tamil|1|91|nos,hbr,mel
The Life of Ram|Govind Vasantha & Pradeep Kumar|96|2018|film|Tamil|3|90|fre,pea,ins
Hosanna|A.R. Rahman & Vijay Prakash|Vinnaithaandi Varuvaayaa|2010|film|Tamil|3|91|rom,eup
Mannipaaya|A.R. Rahman & Shreya Ghoshal|Vinnaithaandi Varuvaayaa|2010|film|Tamil|2|86|hbr,mel
Anbil Avan|A.R. Rahman, Devan Ekambaram & Chinmayi|Vinnaithaandi Varuvaayaa|2010|film|Tamil|4|80|eup,rom
Nee Kavithaigala|Dhibu Ninan Thomas & Pradeep Kumar|Maragatha Naanayam|2017|film|Tamil|2|86|rom,dre,pea
Kanave Kanave|Anirudh Ravichander|David|2013|film|Tamil|2|87|hbr,lon,mel
Enjoy Enjaami|Dhee ft. Arivu|Enjoy Enjaami|2021|indie|Tamil|4|93|ins,eup,con
Vaathi Coming|Anirudh Ravichander & Gana Balachandar|Master|2020|film|Tamil|5|94|con,eup
Naan Pizhai|Anirudh Ravichander, Ravi G & Shashaa Tirupati|Kaathuvaakula Rendu Kaadhal|2022|film|Tamil|2|88|rom,dre
Ey Sandakaara|Santhosh Narayanan & Dhee|Irudhi Suttru|2016|film|Tamil|3|85|rom,con
Aval|Santhosh Narayanan & Pradeep Kumar|Manithan|2016|film|Tamil|2|80|hbr,mel,lon
Katchi Sera|Sai Abhyankkar|Katchi Sera|2024|indie|Tamil|4|92|con,rom,unb
Pookkal Pookkum|G.V. Prakash Kumar, Roop Kumar Rathod & Harini|Madrasapattinam|2010|film|Tamil|2|88|rom,nos,pea
Tum Hi Ho|Arijit Singh|Aashiqui 2|2013|film|Hindi|2|96|rom,hbr
Channa Mereya|Arijit Singh & Pritam|Ae Dil Hai Mushkil|2016|film|Hindi|3|95|hbr,mel
Agar Tum Saath Ho|Alka Yagnik & Arijit Singh|Tamasha|2015|film|Hindi|2|94|hbr,mel,lon
Kabira|Tochi Raina & Rekha Bhardwaj|Yeh Jawaani Hai Deewani|2013|film|Hindi|2|92|nos,mel,los
Ilahi|Arijit Singh|Yeh Jawaani Hai Deewani|2013|film|Hindi|4|90|fre,ins,mc
Kun Faya Kun|A.R. Rahman, Javed Ali & Mohit Chauhan|Rockstar|2011|film|Hindi|2|93|pea,los,ins
Phir Se Ud Chala|Mohit Chauhan|Rockstar|2011|film|Hindi|3|86|fre,dre
Tum Se Hi|Mohit Chauhan|Jab We Met|2007|film|Hindi|2|92|rom,dre,nos
Iktara|Kavita Seth & Amit Trivedi|Wake Up Sid|2009|film|Hindi|2|90|pea,hop,dre
Kho Gaye Hum Kahan|Jasleen Royal & Prateek Kuhad|Baar Baar Dekho|2016|film|Hindi|1|88|pea,rom,dre
cold/mess|Prateek Kuhad|cold/mess|2018|indie|English|2|88|hbr,rom,mel
Kasoor|Prateek Kuhad|Kasoor|2020|indie|Hindi|2|89|rom,pea
Baarishein|Anuv Jain|Baarishein|2018|indie|Hindi|1|90|rom,mel,nos
Husn|Anuv Jain|Husn|2023|indie|Hindi|2|92|hbr,mel
Choo Lo|The Local Train|Aalas Ka Pedh|2015|rock|Hindi|3|88|nos,hop,fre
Aaoge Tum Kabhi|The Local Train|Vaaqif|2018|rock|Hindi|3|84|hbr,hop,lon
Udd Gaye|Ritviz|Udd Gaye|2017|electronic|Hindi|4|88|eup,fre,unb
Liggi|Ritviz|Liggi|2019|electronic|Hindi|4|86|unb,eup
Kesariya|Arijit Singh & Pritam|Brahmastra|2022|film|Hindi|3|95|rom,eup
Raabta|Arijit Singh|Agent Vinod|2012|film|Hindi|2|90|rom,dre
Tujhe Kitna Chahne Lage|Arijit Singh|Kabir Singh|2019|film|Hindi|2|92|hbr,rom
Apna Time Aayega|Ranveer Singh & DIVINE|Gully Boy|2019|hip-hop|Hindi|5|92|con,ins
Mast Magan|Arijit Singh & Chinmayi|2 States|2014|film|Hindi|2|88|rom,pea
Luka Chuppi|A.R. Rahman & Lata Mangeshkar|Rang De Basanti|2006|film|Hindi|2|86|mel,nos,lon
Malare|Vijay Yesudas & Rajesh Murugesan|Premam|2015|film|Malayalam|2|93|rom,nos,dre
Aluva Puzha|Vineeth Sreenivasan|Premam|2015|film|Malayalam|3|86|nos,rom
Darshana|Hesham Abdul Wahab|Hridayam|2021|film|Malayalam|3|92|rom,eup,nos
Uyiril Thodum|Sooraj Santhosh & Anne Amie|Kumbalangi Nights|2019|film|Malayalam|2|88|rom,pea,dre
Cherathukal|Sushin Shyam & Sithara Krishnakumar|Kumbalangi Nights|2019|film|Malayalam|1|86|pea,mel,hop
Mizhiyil Ninnum|Shahabaz Aman|Mayaanadhi|2017|film|Malayalam|1|85|rom,ln,mel
Aaromale|A.R. Rahman & Alphons Joseph|Vinnaithaandi Varuvaayaa|2010|film|Malayalam|3|88|rom,res,los
Illuminati|Sushin Shyam & Dabzee|Aavesham|2024|film|Malayalam|5|93|con,eup,unb
Entammede Jimikki Kammal|Vineeth Sreenivasan & Renjith Unni|Velipadinte Pusthakam|2017|film|Malayalam|5|90|eup,unb
Samajavaragamana|Sid Sriram & Thaman S|Ala Vaikunthapurramuloo|2020|film|Telugu|3|94|rom,eup
Butta Bomma|Armaan Malik & Thaman S|Ala Vaikunthapurramuloo|2020|film|Telugu|4|94|rom,eup,unb
Inkem Inkem Inkem Kaavaale|Sid Sriram & Gopi Sundar|Geetha Govindam|2018|film|Telugu|3|93|rom,dre
Oo Antava Oo Oo Antava|Indravathi Chauhan & Devi Sri Prasad|Pushpa: The Rise|2021|film|Telugu|4|93|con,unb
Adiga Adiga|Sid Sriram|Ninnu Kori|2017|film|Telugu|2|86|hbr,mel,rom
Kadalalle|Sid Sriram & Aishwarya Ravichandran|Dear Comrade|2019|film|Telugu|2|88|rom,hbr,dre
Nee Kannu Neeli Samudram|Javed Ali|Uppena|2021|film|Telugu|3|90|rom,dre
Chitti|Ram Miriyala|Jathi Ratnalu|2021|film|Telugu|3|86|rom,unb
Pasoori|Ali Sethi & Shae Gill|Coke Studio Season 14|2022|pop|Punjabi|4|95|res,rom,con
Tu Jhoom|Naseebo Lal & Abida Parveen|Coke Studio Season 14|2022|folk|Punjabi|2|84|pea,ins,unb
Excuses|AP Dhillon, Gurinder Gill & Intense|Excuses|2020|hip-hop|Punjabi|3|92|hbr,unb,ln
Spring Day|BTS|You Never Walk Alone|2017|pop|Korean|3|92|nos,hop,mel
Through the Night|IU|Palette|2017|pop|Korean|1|88|rom,pea,ln
Plastic Love|Mariya Takeuchi|Variety|1984|pop|Japanese|4|88|ln,nos,unb
Mayonaka no Door / Stay With Me|Miki Matsubara|Pocket Park|1979|pop|Japanese|4|88|ln,nos,rom
La Vie en rose|Édith Piaf|Chansons parisiennes|1947|jazz|French|2|90|rom,nos,dre
Formidable|Stromae|Racine carrée|2013|pop|French|3|85|hbr,pch,lon
Ojitos Lindos|Bad Bunny & Bomba Estéreo|Un Verano Sin Ti|2022|pop|Spanish|3|92|rom,fre,pea
`.trim();
