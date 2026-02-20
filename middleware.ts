// Firebase handles auth client-side, so we don't need server middleware
// for session management. Auth protection is handled by the (app)/layout.tsx
// component which checks useAuth() state.
//
// This middleware file is kept minimal - it only handles basic request processing.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sounds|manifest.json|sw.js|sw.js.map).*)",
  ],
};
