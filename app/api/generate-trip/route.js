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
      
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: `Missing: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    console.log('Generating trip plan for:', { destination, days, budget, travelWith });

    const prompt = `Create a detailed ${days}-day travel itinerary for ${destination}. 
This is for a ${travelWith} traveler with a ${budget} budget.

Please provide a day-by-day itinerary including:
1. Morning, afternoon, and evening activities
2. Recommended restaurants and cuisine (matching the ${budget} budget)
3. Suggested accommodations (matching the ${budget} budget)
4. Transportation recommendations
5. Estimated costs for activities and meals
6. Local tips and cultural considerations

Format the response in a clear, organized way with days as headers and specific times for activities.
Include specific names of places, restaurants, and hotels that match the ${budget} budget level.`;

    console.log('Sending request to OpenAI');
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log('Received response from OpenAI');

    if (!completion.choices?.[0]?.message?.content) {
      console.error('No content in OpenAI response');
      throw new Error('No response content from OpenAI');
    }

    const tripPlan = completion.choices[0].message.content;
    console.log('Successfully generated trip plan');

    return NextResponse.json({ tripPlan });

  } catch (error) {
    console.error('Error in generate-trip API route:', error);
    
    // Handle specific OpenAI errors
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

    // Check for authorization errors
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