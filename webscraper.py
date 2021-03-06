import requests
import webbrowser
import json
from bs4 import BeautifulSoup
import sys
import io


def main():
    #Initialise error variable
    error = "N";outputString = ""

    outputDict = {}

    # This needs to be a system argument ***
    URL = sys.argv[1]
    #Get contents of show URL
    page = requests.get(URL)

    #Create beautiful soup object with page
    soup = BeautifulSoup(page.content, 'lxml')

    #Find profile section
    profile = soup.find_all('section', {"class": "profile"})

    #Get title from profile section
    #Some pages here are different so if can't find first way try just getting the title from a h1
    try:
        title = profile[0].find('a', {"class": "bio__artist-link__a nts-link nts-app"}).text
    except AttributeError:
        title = profile[0].find('h1', {"class": "text-bold"}).text
    except IndexError:
        #If there's an index error then usually the link is incorrect
        error = "Y"

    #Carry on if no errors
    if error == "N":
        #Get bio subtitle div
        date = profile[0].find('div', {"class": "bio__title__subtitle"})

        #Find date within bio subtitle div
        date = date.find('span', {"id": "episode-broadcast-date"}).text

        #Strip date for leading space and commas
        date = date.strip(',')
        date = date.strip()

        songs = soup.find_all('li', {"class": "track"})

        #Make playlist name variable
        playlistName = "NTS" + " " + "//" + " " + title + " " + "//" + " " + date


        outputDict[0] = {}
        outputDict[0]['playlistTitle'] = playlistName
        counter = 1

        for song in songs:
            #Get artist and name from web scrape
            artist = song.find('span',{"class": "track__artist--mobile"}).text
            trackName = song.find('span',{"class": "track__title"}).text

            outputDict[counter] = {}

            outputDict[counter]['title'] = trackName
            outputDict[counter]['artist'] = artist

            counter = counter + 1
            
            #outputString = outputString + ("SpotifyID: " + spotifyId + "\n")

        #print(outputDict)

        jsonOutputDict = json.dumps(outputDict)

        print(jsonOutputDict)

       # with io.open('data.txt', 'w') as outfile:
        #    json.dump(outputDict, outfile)


if __name__ == "__main__":
    main()
