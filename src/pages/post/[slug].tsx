import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
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
}

interface PostProps {
  post: Post;
  timeToRead: number;
}

export default function Post({ post, timeToRead }: PostProps): JSX.Element {
  return <h1>Hi :D</h1>;
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
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMM y',
      {
        locale: ptBR,
      }
    ),
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(currentContent => ({
        heading: currentContent.heading,
        body: RichText.asHtml(currentContent.body),
      })),
    },
  };

  const contentStringsArray = response.data.content.reduce(
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

  return {
    props: {
      post,
      timeToRead,
    },
    revalidate: 60 * 60 * 24,
  };
};
