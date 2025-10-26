import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="relative">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600 animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-30 bg-linear-to-r from-blue-400 to-purple-400" />
        </div>

        <h2 className="mt-8 text-3xl font-bold text-gray-800">
          Page not found
        </h2>

        <p className="mt-4 text-lg text-gray-600 max-w-md mx-auto">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>

        <div className="my-12 flex justify-center">
          <div className="relative">
            <div className="w-64 h-64 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <Search className="w-32 h-32 text-blue-400 opacity-50" />
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-300 rounded-full animate-bounce" />
            <div
              className="absolute -bottom-4 -left-4 w-12 h-12 bg-pink-300 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
