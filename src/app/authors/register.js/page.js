"use client";

import { useState } from "react";
import { UserPlus, BookOpen, FileText, Upload } from "lucide-react";

export default function AuthorRegistrationPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    affiliation: "",
    department: "",
    expertise: "",
    previousPublications: "",
    manuscriptTitle: "",
    manuscriptType: "book",
    expectedCompletion: "",
    agreement: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);

    // API integration here
    const response = await fetch("/api/authors/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert("Registration submitted successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-babcock-blue text-white mb-4">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-babcock-blue mb-4">
              Register as an Author
            </h1>
            <p className="text-gray-600 text-lg">
              Join our community of academic writers and researchers. Publish
              with Babcock University Press.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Progress Steps */}
            <div className="flex justify-between mb-12 relative">
              {[
                { icon: <UserPlus />, label: "Personal Info" },
                { icon: <BookOpen />, label: "Academic Info" },
                { icon: <FileText />, label: "Manuscript" },
                { icon: <Upload />, label: "Submit" },
              ].map((step, index) => (
                <div key={index} className="flex flex-col items-center z-10">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 
                    ${index === 0 ? "bg-babcock-blue text-white" : "bg-gray-200 text-gray-500"}`}>
                    {step.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${index === 0 ? "text-babcock-blue" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
              <div className="absolute top-6 left-12 right-12 h-1 bg-gray-200 -z-10"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Institutional Affiliation *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                  value={formData.affiliation}
                  onChange={(e) =>
                    setFormData({ ...formData, affiliation: e.target.value })
                  }
                  placeholder="e.g., Babcock University, University of Lagos"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Department/Unit *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">
                    Area of Expertise *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.expertise}
                    onChange={(e) =>
                      setFormData({ ...formData, expertise: e.target.value })
                    }>
                    <option value="">Select expertise</option>
                    <option value="sciences">Natural Sciences</option>
                    <option value="social">Social Sciences</option>
                    <option value="arts">Arts & Humanities</option>
                    <option value="business">Business & Economics</option>
                    <option value="health">Health Sciences</option>
                    <option value="engineering">Engineering</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Previous Publications (if any)
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                  value={formData.previousPublications}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      previousPublications: e.target.value,
                    })
                  }
                  placeholder="List any previous publications, journals, or conferences"></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Manuscript Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.manuscriptTitle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        manuscriptTitle: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">
                    Manuscript Type *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-babcock-blue focus:border-transparent"
                    value={formData.manuscriptType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        manuscriptType: e.target.value,
                      })
                    }>
                    <option value="book">Book</option>
                    <option value="textbook">Textbook</option>
                    <option value="monograph">Monograph</option>
                    <option value="journal">Journal Article</option>
                    <option value="proceedings">Conference Proceedings</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  required
                  className="mt-1 mr-3"
                  checked={formData.agreement}
                  onChange={(e) =>
                    setFormData({ ...formData, agreement: e.target.checked })
                  }
                />
                <label className="text-gray-700">
                  I agree to the Terms and Conditions and confirm that the
                  submitted work is original and does not infringe on any
                  copyrights.
                </label>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="submit" className="btn-primary flex-1">
                  Submit Registration
                </button>
                <button
                  type="button"
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Save Draft
                </button>
              </div>
            </form>
          </div>

          {/* Additional Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-xl">
              <h3 className="font-bold text-babcock-blue mb-2">
                Review Process
              </h3>
              <p className="text-gray-600">
                All submissions undergo rigorous peer review by experts in the
                field.
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl">
              <h3 className="font-bold text-babcock-blue mb-2">
                Author Benefits
              </h3>
              <p className="text-gray-600">
                Get royalties, marketing support, and global distribution.
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl">
              <h3 className="font-bold text-babcock-blue mb-2">Support</h3>
              <p className="text-gray-600">
                Our editorial team provides guidance throughout the publishing
                process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
