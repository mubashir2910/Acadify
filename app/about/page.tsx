import { HeroHeader } from '@/components/header'
import BookDemo from '@/components/book-demo'
import Footer from '@/components/footer'
import { ForceLight } from '@/components/force-theme'
import AboutStory from './components/about-story'

export default function AboutPage() {
    return (
        <ForceLight>
            <BookDemo />
            <HeroHeader />
            <main className="relative min-h-screen bg-slate-50 pb-24 pt-28 md:pt-32">
                <AboutStory />
            </main>
            <Footer />
        </ForceLight>
    )
}
