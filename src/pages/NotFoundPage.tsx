import { Link } from 'react-router'
import { Empty } from '@/components/ui/Reveal'
import { useDocumentMeta } from '@/lib/hooks'
import { useLang } from '@/lib/i18n'

export function NotFoundPage() {
  const { t } = useLang()
  useDocumentMeta({ title: t('notfound.title'), noindex: true })
  return (
    <div className="py-16">
      <Empty
        title={t('notfound.title')}
        body={t('notfound.body')}
        action={
          <Link to="/catalog" className="btn-primary">
            {t('catalog.title')}
          </Link>
        }
      />
    </div>
  )
}
