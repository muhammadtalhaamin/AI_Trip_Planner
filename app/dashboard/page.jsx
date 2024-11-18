'use client'
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, User, Heart, Coins, CircleDollarSign, Wallet, MapPin, Clock, DollarSign, Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Simplified image cache
const imageCache = new Map();

const fetchImageFromPexels = async (query) => {
  if (imageCache.has(query)) {
    return imageCache.get(query);
  }
  
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: process.env.NEXT_PUBLIC_PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Error fetching from Pexels:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      const imageUrl = data.photos[0].src.medium;
      imageCache.set(query, imageUrl); // Cache the image URL
      return imageUrl;
    }
  } catch (error) {
    console.error('Error fetching image from Pexels:', error);
  }
  return null; // Return null if no image was fetched
};

const TripPlannerDashboard = () => {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(1);
  const [budget, setBudget] = useState('');
  const [travelWith, setTravelWith] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState(null);
  const [error, setError] = useState(null);
  const [viewTripPlan, setViewTripPlan] = useState(false);
  const [hotelImages, setHotelImages] = useState([]);
  const [activityImages, setActivityImages] = useState({});
  
  const destinations = ['Paris, France', 'London, UK', 'New York, USA', 'Tokyo, Japan', 'Barcelona, Spain', 'Rome, Italy'];

  const filteredDestinations = destinations.filter(dest => dest.toLowerCase().includes(destination.toLowerCase()));

  const handleGenerateTrip = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination,
          days,
          budget,
          travelWith,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate trip plan');
      }

      const data = await response.json();
      if (data.hotels && data.itinerary && data.itinerary.dailyPlans) {
        setTripPlan(data);
        setViewTripPlan(true); // Switch to trip plan view
        fetchImages(data); // Fetch images after loading the plan
      } else {
        throw new Error('Invalid trip plan data structure');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImages = async (plan) => {
    const fetchedHotelImages = await Promise.all(
      plan.hotels.map(hotel =>
        fetchImageFromPexels(hotel.name || `${destination} hotel`)
      )
    );
    setHotelImages(fetchedHotelImages);

    let fetchedActivityImages = {};
    for (let dayIndex = 0; dayIndex < plan.itinerary.dailyPlans.length; dayIndex++) {
      const day = plan.itinerary.dailyPlans[dayIndex];
      for (let actIndex = 0; actIndex < day.activities.length; actIndex++) {
        const activity = day.activities[actIndex];
        const imageUrl = await fetchImageFromPexels(activity.placeName || `${destination} activity`);
        fetchedActivityImages[`${dayIndex}-${actIndex}`] = imageUrl;
      }
    }
    setActivityImages(fetchedActivityImages);
  };

  const downloadTripPlanAsPDF = async () => {
    const input = document.getElementById('trip-plan');

    try {
      let images = input.getElementsByTagName('img');
      let imagesArr = Array.from(images);

      await Promise.all(imagesArr.map(img => 
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        })
      ));

      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`trip-plan-${destination.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const TripPlanDisplay = ({ plan }) => (
    <div className="space-y-8" id="trip-plan">
      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-4xl font-bold mb-8 items-center text-center">🚀🚀🚀 Your Customized Trip Plan 🚀🚀🚀</h2>
        <h2 className="text-2xl font-bold mb-4">Recommended Hotels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plan.hotels.map((hotel, index) => (
            <Card key={index} className="overflow-hidden">
              <img src={hotelImages[index] || 'https://picsum.photos/400/200?random'} alt={hotel.name} className="w-full h-48 object-cover" />
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{hotel.name}</h3>
                <div className="flex items-center gap-1 text-yellow-500 mt-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{hotel.rating}/5</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{hotel.description}</p>
                <div className="flex items-center gap-1 text-gray-500 mt-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{hotel.address}</span>
                </div>
                <p className="font-semibold mt-2">${hotel.pricePerNight}/night</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Daily Itinerary</h2>
        <p className="text-gray-600 mb-6">
          Best time to visit: {plan.itinerary.bestTimeToVisit}
        </p>
        <div className="space-y-8">
          {plan.itinerary.dailyPlans.map((day, dayIndex) => (
            <div key={dayIndex} className="border-b pb-6 last:border-b-0">
              <h3 className="text-xl font-semibold mb-4">Day {day.day}</h3>
              <div className="space-y-4">
                {day.activities.map((activity, actIndex) => (
                  <Card key={actIndex} className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <img
                        src={activityImages[`${dayIndex}-${actIndex}`] || 'https://picsum.photos/400/200?random'}
                        alt={activity.placeName}
                        className="w-full md:w-48 h-32 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{activity.placeName}</h4>
                          <span className="text-gray-600">{activity.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {activity.placeDetails}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{activity.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{activity.ticketPrice}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {activity.coordinates.latitude}, {activity.coordinates.longitude}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Meals</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {day.meals.map((meal, mealIndex) => (
                    <Card key={mealIndex} className="p-4">
                      <h5 className="font-semibold capitalize">{meal.type}</h5>
                      <p className="text-sm font-medium">{meal.restaurantName}</p>
                      <p className="text-sm text-gray-600">{meal.cuisine}</p>
                      <p className="text-sm text-gray-600">$ {meal.priceRange}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="flex gap-2 mt-4">
        <Button onClick={() => setViewTripPlan(false)}>
          Go Back
        </Button>
        <Button onClick={downloadTripPlanAsPDF}>
          Download as PDF
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-50">
      {!viewTripPlan ? (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              🚀🌟 Plan Your Perfect Trip 🌟🚀
            </h1>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}


          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Destination 🏖️
                </h2>
                <div className="relative">
                  <Input
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowSuggestions(true);
                    }}
                    placeholder="Start typing a destination..."
                    className="w-full"
                  />
                  {showSuggestions && destination && (
                    <div className="absolute z-10 w-full bg-white shadow-lg rounded-md mt-1 border max-h-48 overflow-auto">
                      {filteredDestinations.map((dest) => (
                        <div
                          key={dest}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setDestination(dest);
                            setShowSuggestions(false);
                          }}
                        >
                          {dest}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Duration 🕜
                </h2>
                <Input
                  type="number"
                  min="1"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  placeholder="Number of days"
                  className="w-full"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Budget Range 💳
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: Coins,
                    title: 'Budget',
                    desc: 'Cost conscious',
                    value: 'cheap',
                    iconColor: 'text-green-500',
                  },
                  {
                    icon: Wallet,
                    title: 'Moderate',
                    desc: 'Average cost',
                    value: 'moderate',
                    iconColor: 'text-blue-500',
                  },
                  {
                    icon: CircleDollarSign,
                    title: 'Luxury',
                    desc: 'Premium experience',
                    value: 'luxury',
                    iconColor: 'text-purple-500',
                  },
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      budget === option.value
                        ? `ring-2 ring-${option.iconColor.split('-')[1]}-500`
                        : ''
                    }`}
                    onClick={() => setBudget(option.value)}
                  >
                    <CardContent className="p-4 text-center space-y-2">
                      <option.icon
                        className={`w-8 h-8 mx-auto ${option.iconColor}`}
                      />
                      <h3 className="font-semibold">{option.title}</h3>
                      <p className="text-gray-600 text-sm">{option.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Travel Companions 🚗
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: User,
                    title: 'Solo',
                    desc: 'Solo explorer',
                    value: 'solo',
                    iconColor: 'text-orange-500',
                  },
                  {
                    icon: Heart,
                    title: 'Couple',
                    desc: 'Travel together',
                    value: 'couple',
                    iconColor: 'text-pink-500',
                  },
                  {
                    icon: Users,
                    title: 'Family',
                    desc: 'Group adventure',
                    value: 'family',
                    iconColor: 'text-indigo-500',
                  },
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      travelWith === option.value
                        ? `ring-2 ring-${option.iconColor.split('-')[1]}-500`
                        : ''
                    }`}
                    onClick={() => setTravelWith(option.value)}
                  >
                    <CardContent className="p-4 text-center space-y-2">
                      <option.icon
                        className={`w-8 h-8 mx-auto ${option.iconColor}`}
                      />
                      <h3 className="font-semibold">{option.title}</h3>
                      <p className="text-gray-600 text-sm">{option.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
                
            <Button
              className="w-full py-6 text-lg font-semibold rounded-lg"
              onClick={handleGenerateTrip}
              disabled={!destination || !days || !budget || !travelWith || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0112.63-7.14A7.94 7.94 0 0116 12H4z"
                    ></path>
                  </svg>
                  Generating Trip Plan...
                </span>
              ) : (
                'Generate Trip Plan'
              )}
            </Button>
            {isLoading && (
            <Alert>
              <AlertDescription>
                Generating your trip plan... This may take a few moments.
              </AlertDescription>
            </Alert>
          )}
          </div>
        </div>
      ) : (
        <TripPlanDisplay plan={tripPlan} />
      )}
    </div>
  );
};

export default TripPlannerDashboard;