'use client'
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, User, Heart, Coins, CircleDollarSign, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert"

const TripPlannerDashboard = () => {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(1);
  const [budget, setBudget] = useState('');
  const [travelWith, setTravelWith] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState(null);
  const [error, setError] = useState(null);

  const destinations = [
    'Paris, France', 'London, UK', 'New York, USA',
    'Tokyo, Japan', 'Barcelona, Spain', 'Rome, Italy'
  ];

  const filteredDestinations = destinations.filter(dest =>
    dest.toLowerCase().includes(destination.toLowerCase())
  );

  const handleGenerateTrip = async () => {
    console.log("Button clicked");
    setIsLoading(true);
    setError(null);
    setTripPlan(null);

     // Log the request payload
     console.log('Sending request with payload:', {
      destination,
      days,
      budget,
      travelWith,
    });
  
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

      // Log the response status
      console.log('Response status:', response.status);
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate trip plan');
      }
  
      const data = await response.json();
      setTripPlan(data.tripPlan);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const SectionTitle = ({ children }) => (
    <h2 className="text-xl font-semibold text-gray-800 mb-3">{children}</h2>
  );

  const TripPlanDisplay = ({ plan }) => {
    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Your Trip Plan</h2>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap">{plan}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-50">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">🚀🌟 Plan Your Perfect Trip 🌟🚀</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

         {/* Loading State Display */}
         {isLoading && (
          <Alert>
            <AlertDescription>
              Generating your trip plan... This may take a few moments.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Destination & Days Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Destination Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <SectionTitle>Destination 🏖️</SectionTitle>
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

            {/* Days Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <SectionTitle>Duration 🕜</SectionTitle>
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

          {/* Budget Section */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <SectionTitle>Budget Range 💳</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  icon: Coins,
                  title: 'Budget',
                  desc: 'Cost conscious',
                  value: 'cheap',
                  iconColor: 'text-green-500'
                },
                { 
                  icon: Wallet,
                  title: 'Moderate',
                  desc: 'Average cost',
                  value: 'moderate',
                  iconColor: 'text-blue-500'
                },
                { 
                  icon: CircleDollarSign,
                  title: 'Luxury',
                  desc: 'Premium experience',
                  value: 'luxury',
                  iconColor: 'text-purple-500'
                }
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
                    <option.icon className={`w-8 h-8 mx-auto ${option.iconColor}`} />
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-gray-600 text-sm">{option.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Travel With Section */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <SectionTitle>Travel Companions 🚗</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  icon: User,
                  title: 'Solo',
                  desc: 'Solo explorer',
                  value: 'solo',
                  iconColor: 'text-orange-500'
                },
                { 
                  icon: Heart,
                  title: 'Couple',
                  desc: 'Travel together',
                  value: 'couple',
                  iconColor: 'text-pink-500'
                },
                { 
                  icon: Users,
                  title: 'Family',
                  desc: 'Group adventure',
                  value: 'family',
                  iconColor: 'text-indigo-500'
                }
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
                    <option.icon className={`w-8 h-8 mx-auto ${option.iconColor}`} />
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-gray-600 text-sm">{option.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button 
              className="w-full py-6 text-lg font-semibold rounded-lg"
              onClick={handleGenerateTrip}
              disabled={!destination || !days || !budget || !travelWith || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0112.63-7.14A7.94 7.94 0 0116 12H4z"></path>
                  </svg>
                  Generating Trip Plan...
                </span>
              ) : (
                'Generate Trip Plan'
              )}
            </Button>
        </div>

        {/* Trip Plan Display with better formatting */}
        {tripPlan && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Your Trip Plan</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {tripPlan}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlannerDashboard;