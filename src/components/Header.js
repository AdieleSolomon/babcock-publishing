"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  ChevronDown,
  BookOpen,
  Users,
  GraduationCap,
  Info,
  Mail,
  Printer,
  Search,
} from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [authorsOpen, setAuthorsOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "/" },
    {
      name: "Authors",
      href: "#",
      icon: <Users className="w-4 h-4 mr-1" />,
      dropdown: [
        { name: "Register as Author", href: "/authors/register" },
        { name: "Upload Books for Review", href: "/authors/upload" },
        { name: "Submit for Publishing", href: "/authors/submit" },
        { name: "Author Guidelines", href: "/authors/guidelines" },
      ],
    },
    {
      name: "Student Training",
      href: "/training",
      icon: <GraduationCap className="w-4 h-4 mr-1" />,
    },
    {
      name: "Services",
      href: "/services",
      icon: <Printer className="w-4 h-4 mr-1" />,
      dropdown: [
        { name: "Book Publishing", href: "/services/publishing" },
        { name: "Printing Services", href: "/services/printing" },
        { name: "Editing & Proofreading", href: "/services/editing" },
        { name: "ISBN Registration", href: "/services/isbn" },
        { name: "Distribution", href: "/services/distribution" },
      ],
    },
    {
      name: "Publications",
      href: "/publications",
      icon: <BookOpen className="w-4 h-4 mr-1" />,
      dropdown: [
        { name: "Latest Releases", href: "/publications/latest" },
        { name: "Academic Journals", href: "/publications/journals" },
        { name: "Textbooks", href: "/publications/textbooks" },
        { name: "Research Papers", href: "/publications/research" },
        { name: "Browse Catalog", href: "/publications/catalog" },
      ],
    },
    {
      name: "About Us",
      href: "/about",
      icon: <Info className="w-4 h-4 mr-1" />,
    },
    {
      name: "Contact Us",
      href: "/contact",
      icon: <Mail className="w-4 h-4 mr-1" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container-custom">
        <div className="flex justify-between items-center h-20 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-babcock-blue text-white">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-babcock-blue">
                Babcock University
              </h1>
              <p className="text-sm text-babcock-gold font-semibold">
                Publishing Company
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                {item.dropdown ? (
                  <button className="flex items-center px-4 py-2 text-gray-700 hover:text-babcock-blue hover:bg-blue-50 rounded-lg transition">
                    {item.icon}
                    {item.name}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center px-4 py-2 text-gray-700 hover:text-babcock-blue hover:bg-blue-50 rounded-lg transition">
                    {item.icon}
                    {item.name}
                  </Link>
                )}

                {item.dropdown && (
                  <div className="absolute left-0 mt-2 w-64 bg-white shadow-xl rounded-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border">
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-4 py-3 text-gray-700 hover:bg-babcock-blue hover:text-white transition">
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button className="btn-secondary ml-4">Get Quote</button>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  {item.dropdown ? (
                    <>
                      <button
                        onClick={() => setAuthorsOpen(!authorsOpen)}
                        className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg">
                        <div className="flex items-center">
                          {item.icon}
                          {item.name}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${authorsOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {authorsOpen && (
                        <div className="ml-4 space-y-2">
                          {item.dropdown.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className="block px-4 py-2 text-gray-600 hover:text-babcock-blue"
                              onClick={() => setIsOpen(false)}>
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg"
                      onClick={() => setIsOpen(false)}>
                      {item.icon}
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
              <button className="btn-secondary w-full mt-4">Get Quote</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
