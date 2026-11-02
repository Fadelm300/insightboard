import { NextResponse } from "next/server";

export function successResponse(
  data: unknown = {},
  message = "Success",
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function errorResponse(message = "Error", status = 500) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}