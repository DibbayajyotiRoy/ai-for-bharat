import { NextResponse } from "next/server";
import { invokeNova } from "@/lib/bedrock";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const output = await invokeNova(prompt);

    return NextResponse.json({ output });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
