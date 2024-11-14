// app/api/generate-trip/route.js
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request) {
  console.log('API route hit: /api/generate-trip');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log('Received request body:', body);

    const { destination, days, budget, travelWith } = body;

    // Validate required fields
    if (!destination || !days || !budget || !travelWith) {
      const missingFields = [];
      if (!destination) missingFields.push('destination');
      if (!days) missingFields.push('days');
      if (!budget) missingFields.push('budget');
      if (!travelWith) missingFields.push('travelWith');
      
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: `Missing: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a travel planning assistant that always responds with valid JSON data. Your responses should strictly follow the provided JSON structure and include realistic details for hotels, activities, and restaurants.`;

    const userPrompt = `Create a detailed ${days}-day travel itinerary for ${destination} for a ${travelWith} traveler with a ${budget} budget.
    
Your response must be a valid JSON object with the following structure:

{
  "hotels": [
    {
      "name": "Hotel name",
      "address": "Full hotel address",
      "pricePerNight": "Price in USD",
      "imageUrl": "URL to hotel image",
      "coordinates": {
        "latitude": "Latitude",
        "longitude": "Longitude"
      },
      "rating": "Rating out of 5",
      "description": "Brief hotel description",
      "amenities": ["List", "of", "key", "amenities"]
    }
  ],
  "itinerary": {
    "destination": "${destination}",
    "numberOfDays": ${days},
    "bestTimeToVisit": "Best season/months to visit",
    "dailyPlans": [
      {
        "day": 1,
        "activities": [
          {
            "time": "Time slot (e.g., '09:00 AM')",
            "placeName": "Name of the place/activity",
            "placeDetails": "Detailed description",
            "placeImageUrl": "URL to place image",
            "coordinates": {
              "latitude": "Latitude",
              "longitude": "Longitude"
            },
            "ticketPrice": "Price in USD or 'Free'",
            "duration": "Estimated duration",
            "tips": "Local tips or recommendations"
          }
        ],
        "meals": [
          {
            "type": "breakfast/lunch/dinner",
            "restaurantName": "Name of restaurant",
            "cuisine": "Type of cuisine",
            "priceRange": "Price range in USD",
            "coordinates": {
              "latitude": "Latitude",
              "longitude": "Longitude"
            }
          }
        ]
      }
    ]
  }
}

Requirements:
1. Suggest 3-4 hotels matching the ${budget} budget level
2. Each day should have 3-4 activities
3. itinerary should consist of ${days}-days
3. Include all three meals each day
4. All prices should be in USD
5. All coordinates should be actual geographical coordinates
6. All suggested places should be real and actually located in ${destination}
7. For image URLs, use placeholder image URLs in the format: "/api/placeholder/800/600"`;

    console.log('Sending request to OpenAI');
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 4500
    });

    console.log('Received response from OpenAI');

    if (!completion.choices?.[0]?.message?.content) {
      console.error('No content in OpenAI response');
      throw new Error('No response content from OpenAI');
    }

    try {
      // Parse the JSON response
      const tripPlan = JSON.parse(completion.choices[0].message.content);
      console.log(tripPlan);
      console.log('Successfully generated trip plan');

      // Validate the response structure
      if (!tripPlan.hotels || !tripPlan.itinerary || !tripPlan.itinerary.dailyPlans) {
        throw new Error('Invalid response structure from AI');
      }

      return NextResponse.json(tripPlan);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse AI response', 
          details: parseError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in generate-trip API route:', error);
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded' },
        { status: 429 }
      );
    }

    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate trip plan', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}