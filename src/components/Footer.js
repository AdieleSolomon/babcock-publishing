import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-babcock-blue text-white">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-babcock-gold flex items-center justify-center">
                <span className="text-babcock-blue font-bold text-xl">
                  BUPC
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Babcock University</h3>
                <p className="text-babcock-gold font-semibold">
                  Publishing Company
                </p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Official publishing and printing press of Babcock University.
              Promoting academic excellence through quality publications.
            </p>
            <div className="flex space-x-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-full bg-babcock-navy flex items-center justify-center hover:bg-babcock-gold hover:text-babcock-blue transition">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-bold mb-6 border-l-4 border-babcock-gold pl-3">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                "Home",
                "Authors",
                "Services",
                "Publications",
                "Training",
                "About",
                "Contact",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href={`/${item.toLowerCase().replace(" ", "-")}`}
                    className="text-gray-300 hover:text-babcock-gold transition">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xl font-bold mb-6 border-l-4 border-babcock-gold pl-3">
              Our Services
            </h4>
            <ul className="space-y-3">
              {[
                "Book Publishing",
                "Academic Printing",
                "Journal Publication",
                "Editing Services",
                "ISBN Registration",
                "Book Distribution",
                "Training Workshops",
              ].map((service) => (
                <li
                  key={service}
                  className="text-gray-300 hover:text-babcock-gold transition">
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xl font-bold mb-6 border-l-4 border-babcock-gold pl-3">
              Contact Us
            </h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-babcock-gold mt-1" />
                <p className="text-gray-300">
                  Babcock University,
                  <br />
                  Ilishan-Remo, Ogun State,
                  <br />
                  Nigeria
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-babcock-gold" />
                <p className="text-gray-300">+234 (0) 803 123 4567</p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-babcock-gold" />
                <p className="text-gray-300">publishing@babcock.edu.ng</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Babcock University Publishing
            Company. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
