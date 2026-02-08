
import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/config/api";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, MessageSquare, Send, User, Phone, CheckCircle2 } from "lucide-react";

interface ContactFormData {
    name: string;
    mobile: string;
    email: string;
    message: string;
}

const INITIAL_DATA: ContactFormData = {
    name: "",
    mobile: "",
    email: "",
    message: "",
};

const SESSION_KEY = "seekkrr_contact_submitted";

export function ContactUsPage() {
    const [formData, setFormData] = useState<ContactFormData>(INITIAL_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const hasSubmitted = sessionStorage.getItem(SESSION_KEY);
        if (hasSubmitted === "true") {
            setIsSuccess(true);
        }
    }, []);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Zod schema for validation
        const contactFormSchema = z.object({
            name: z.string().trim().min(1, { message: "Full name is required." }),
            email: z.string().trim().email({ message: "Please enter a valid email address." }),
            // Mobile is optional, but if present must be 10 digits
            mobile: z.string().trim().optional().refine((val) => !val || /^\d{10}$/.test(val), {
                message: "Mobile number must be 10 digits.",
            }),
            message: z.string().trim().min(1, { message: "Message cannot be empty." }),
        });

        const validationResult = contactFormSchema.safeParse(formData);

        if (!validationResult.success) {
            toast.error(
                validationResult.error?.errors?.[0]?.message || "Invalid input."
            );
            return;
        }

        setIsSubmitting(true);
        try {
            // Using the centralized API endpoints
            await api.post(`${API_ENDPOINTS.QUERIES.SUBMIT}`, validationResult.data);
            setIsSuccess(true);
            sessionStorage.setItem(SESSION_KEY, "true");
            toast.success("Message sent successfully!");
            setFormData(INITIAL_DATA);
        } catch (error) {
            console.error("Contact form error:", error);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
                <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-neutral-100">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-4">Message Sent!</h2>
                    <p className="text-neutral-600 mb-8">
                        Thank you for reaching out. We have received your message and will get back to you shortly.
                    </p>
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors"
                    >
                        Send Another Message
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                {/* Left Column: Content */}
                <div className="space-y-8 animate-slide-up">
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-bold text-neutral-900 tracking-tight mb-6">
                            Get in touch
                        </h1>
                        <p className="text-lg text-neutral-600 leading-relaxed max-w-lg">
                            Have questions, suggestions, or just want to say hello? We'd love to hear from you.
                            Fill out the form and we'll be in touch as soon as possible.
                        </p>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-4 text-neutral-600">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-900">Email Us</p>
                                <p className="text-sm">seekkrr@gmail.com</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-neutral-600">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-900">Support</p>
                                <p className="text-sm">Available Mon-Fri, 9am-6pm</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Form */}
                <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg shadow-neutral-100 border border-neutral-100 animate-slide-up" style={{ animationDelay: "100ms" }}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="mobile" className="block text-sm font-medium text-neutral-700">
                                Mobile Number <span className="text-neutral-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <input
                                    type="tel"
                                    id="mobile"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    placeholder="9876543210"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message" className="block text-sm font-medium text-neutral-700">
                                Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows={4}
                                placeholder="How can we help you?"
                                className="block w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-neutral-50/50 transition-all outline-none resize-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none translate-y-0 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 mr-2" />
                                    Send Message
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
