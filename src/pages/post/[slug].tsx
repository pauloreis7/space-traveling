import { useEffect } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
  timeToRead: string;
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const scriptParentNode = document.getElementById(
      'inject-comments-for-uterances'
    );
    if (!scriptParentNode) return;

    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.async = true;
    script.setAttribute('repo', 'pauloreis7/space-traveling');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('label', 'comment :speech_balloon:');
    script.setAttribute('theme', 'photon-dark');
    script.setAttribute('crossorigin', 'anonymous');

    scriptParentNode.appendChild(script);

    // scriptParentNode.removeChild(scriptParentNode.firstChild as Node);
  }, []);

  if (router.isFallback) {
    return <strong>Carregando...</strong>;
  }

  const postContent = post.data.content.map(currentContent => ({
    heading: currentContent.heading,
    body: RichText.asHtml(currentContent.body),
  }));

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM y',
    {
      locale: ptBR,
    }
  );

  const formattedLastDate = format(
    new Date(post.last_publication_date),
    "'* editado em 'dd MMM y', às 'HH':'mm",
    {
      locale: ptBR,
    }
  );

  const contentStringsArray = post.data.content.reduce(
    (accumulator, currentContent) => {
      const headingStringsArray = currentContent.heading.split(' ');
      const bodyStringsArray = RichText.asText(currentContent.body).split(' ');

      const currentContentStringsArray = [
        ...headingStringsArray,
        ...bodyStringsArray,
      ];

      return [...accumulator, ...currentContentStringsArray];
    },
    []
  );
  const timeToRead = Math.ceil(contentStringsArray.length / 200);

  return (
    <>
      <Head>
        <title>{post.data.title} | spaceTraveling</title>
      </Head>

      <img
        src={post.data.banner.url}
        alt={post.data.title}
        className={styles.postImage}
      />

      <main className={styles.postContainer}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>

          <div className={commonStyles.postDetails}>
            <span>
              <FiCalendar />
              {formattedDate}
            </span>

            <span>
              <FiUser />
              {post.data.author}
            </span>

            <span>
              <FiClock />
              {timeToRead} min
            </span>
          </div>
          <p>{formattedLastDate}</p>

          <div>
            {postContent.map(content => (
              <section key={content.heading} className={styles.postSection}>
                <h2>{content.heading}</h2>

                <div dangerouslySetInnerHTML={{ __html: content.body }} />
              </section>
            ))}
          </div>

          <div id="inject-comments-for-uterances" />
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'post'),
    {
      pageSize: 3,
      fetch: [
        'post.title',
        'post.subtitle',
        'post.author',
        'post.banner',
        'post.content',
      ],
    }
  );

  const staticPathsFallback = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths: staticPathsFallback,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60 * 24,
  };
};
