import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are a travel planning assistant that always responds with valid JSON data that exactly matches the specified structure.`;

const createUserPrompt = (destination, days, budget, travelWith) => `Create a ${days}-day travel itinerary for ${destination} (${travelWith}, ${budget} budget).
The response MUST strictly follow this exact JSON structure:

{
  "hotels": [
    {
      "name": "Hotel name",
      "address": "Hotel address",
      "pricePerNight": "Price in USD",
      "imageUrl": "/api/placeholder/800/600",
      "coordinates": {
        "latitude": "lat",
        "longitude": "long"
      },
      "rating": "Rating /5",
      "description": "Brief description",
      "amenities": ["amenity1", "amenity2"]
    }
  ],
  "itinerary": {
    "destination": "${destination}",
    "numberOfDays": ${days},
    "bestTimeToVisit": "Best time to visit",
    "dailyPlans": [
      {
        "day": 1,
        "activities": [
          {
            "time": "Time (e.g., 09:00 AM)",
            "placeName": "Place name",
            "placeDetails": "Brief details",
            "placeImageUrl": "/api/placeholder/800/600",
            "coordinates": {
              "latitude": "lat",
              "longitude": "long"
            },
            "ticketPrice": "Price in USD or Free",
            "duration": "Duration",
            "tips": "Brief tip"
          }
        ],
        "meals": [
          {
            "type": "breakfast/lunch/dinner",
            "restaurantName": "Restaurant name",
            "cuisine": "Cuisine type",
            "priceRange": "Price in USD",
            "coordinates": {
              "latitude": "lat",
              "longitude": "long"
            }
          }
        ]
      }
    ]
  }
}

Requirements:
1. Include exactly three hotels
2. Each day must have exactly three activities
3. Each day must have exactly three meals
4. All image URLs must be "/api/placeholder/800/600"
5. Keep all text descriptions under 100 characters
6. All coordinates must be provided
7. All prices must be in USD format`;

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { destination, days, budget, travelWith } = body;

    if (!destination || !days || !budget || !travelWith) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: createUserPrompt(destination, days, budget, travelWith) }
      ],
      model: "gpt-3.5-turbo-1106",
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse the response
    const tripPlan = JSON.parse(content);

    // Validate the essential structure
    if (!tripPlan.hotels || !Array.isArray(tripPlan.hotels) || 
        !tripPlan.itinerary || !tripPlan.itinerary.dailyPlans || 
        !Array.isArray(tripPlan.itinerary.dailyPlans)) {
      throw new Error('Invalid response structure from AI');
    }

    // Validate each day has required structure
    tripPlan.itinerary.dailyPlans.forEach((day, index) => {
      if (!day.activities || !Array.isArray(day.activities) ||
          !day.meals || !Array.isArray(day.meals)) {
        throw new Error(`Invalid structure for day ${index + 1}`);
      }
    });

    return NextResponse.json(tripPlan);

  } catch (error) {
    const status = 
      error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded' ? 429 :
      error.response?.status === 401 ? 401 : 500;

    return NextResponse.json(
      { 
        error: 'Failed to generate trip plan', 
        details: error.message,
        source: 'API route error handler'
      },
      { status }
    );
  }
}