import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const authorData = await request.json();

    // Save to database
    const { data, error } = await supabase
      .from("authors")
      .insert([
        {
          ...authorData,
          status: "pending",
          registration_date: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send confirmation email (would integrate with email service)
    // await sendConfirmationEmail(authorData.email);

    return NextResponse.json(
      {
        message: "Author registration submitted successfully!",
        data: data[0],
        next_steps: [
          "Our team will review your application within 5 business days",
          "You will receive a confirmation email with your author ID",
          "Prepare your manuscript following our guidelines",
        ],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Get all authors (for admin panel)
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .order("registration_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
