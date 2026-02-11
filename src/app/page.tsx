"use client";

import { redirect } from "next/navigation";

/**
 * Temporary homepage redirect
 *
 * We want users to land directly in the mental maths drill builder.
 * The previous marketing homepage layout has been archived separately.
 */
export default function IndexRedirect() {
  redirect("/mental-maths/drill");
}

