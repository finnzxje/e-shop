import { Mail, Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Logo + About */}
        <div>
          <h2 className="text-2xl font-bold text-white">MyBrand</h2>
          <p className="mt-4 text-sm text-gray-400 leading-6">
            We are committed to delivering sustainable, eco-friendly, and
            high-quality products.
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
          <ul className="space-y-3">
            <li>
              <a href="#" className="hover:text-white">
                Men
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Women
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Kids
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Accessories
              </a>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
          <ul className="space-y-3">
            <li>
              <a href="#" className="hover:text-white">
                Contact
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                FAQs
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Return Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Warranty
              </a>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Subscribe to Newsletter
          </h3>
          <form className="flex flex-col gap-3">
            <div className="flex items-center bg-gray-800 rounded-full overflow-hidden">
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 bg-gray-800 text-gray-300 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition"
              >
                <Mail size={18} />
              </button>
            </div>
          </form>
          <div className="flex gap-4 mt-6">
            <a href="#" className="hover:text-white">
              <Facebook />
            </a>
            <a href="#" className="hover:text-white">
              <Instagram />
            </a>
            <a href="#" className="hover:text-white">
              <Twitter />
            </a>
            <a href="#" className="hover:text-white">
              <Youtube />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} MyBrand. All rights reserved.
      </div>
    </footer>
  );
};
