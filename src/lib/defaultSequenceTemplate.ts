import { Section } from '../types';
import { generateUUID } from './uuid';

// Default sequence template - a comprehensive yoga/sculpt sequence
export const DEFAULT_SEQUENCE_TEMPLATE: Section[] = [
  {
    "id": "4dac21f6-36b3-4e84-a0e2-3318753c4e65",
    "name": "Integration",
    "type": "section",
    "items": [
      {
        "id": "44ac9587-12b3-44d3-86d1-d7a349137108",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "0473c3ef-fb99-4680-88d2-cc9792e743b5"
      },
      {
        "id": "e775fa2e-fc54-4d29-b2fe-4487ccc485a0",
        "type": "pose_instance",
        "duration": "01:00",
        "poseVariationId": "39a2778d-2d57-428d-bb4b-f87b23efd060"
      },
      {
        "id": "98bfa82b-3c9e-46da-9df2-b9558ef2658f",
        "type": "pose_instance",
        "duration": "00:15",
        "poseVariationId": "5b3ed9a8-85a9-4afe-b0eb-0226b3100872"
      },
      {
        "id": "2b449495-e1fb-4994-ad29-929cb7926bea",
        "type": "pose_instance",
        "duration": "00:45",
        "poseVariationId": "e1099baa-848d-4776-b71a-d3dcac5d822b"
      },
      {
        "id": "4ea78b3c-92cf-4cfd-9789-c31e3b6c9931",
        "type": "pose_instance",
        "duration": "01:30",
        "poseVariationId": "e4cf42dc-d8cb-4e62-ab01-2ba76c55a015"
      },
      {
        "id": "4e4112b0-4600-423d-8603-f5e4a6a70de3",
        "sets": 5,
        "type": "group_block",
        "items": [
          {
            "id": "c1e1fd81-f03e-4a5a-b592-1e1240265371",
            "type": "pose_instance",
            "duration": "00:03",
            "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
          },
          {
            "id": "d5e82287-3b49-45a0-8b56-5f4d0675cb3a",
            "type": "pose_instance",
            "duration": "00:03",
            "poseVariationId": "e98bd72f-8ba3-418b-b557-e7c27de47ce4"
          }
        ],
        "roundOverrides": [],
        "itemSubstitutes": []
      },
      {
        "id": "b4518ee7-400d-4796-9099-551eff888e11",
        "sets": 5,
        "type": "group_block",
        "items": [
          {
            "id": "20bdb05e-de71-46cb-b333-961fdb5904b3",
            "type": "pose_instance",
            "duration": "00:03",
            "poseVariationId": "e98bd72f-8ba3-418b-b557-e7c27de47ce4"
          },
          {
            "id": "ec8b5fea-2eda-4e19-9784-27c5c8ab47ba",
            "type": "pose_instance",
            "duration": "00:03",
            "poseVariationId": "6fbd15c4-9e59-4c3e-ae12-784913a00f90"
          }
        ],
        "roundOverrides": [],
        "itemSubstitutes": []
      }
    ]
  },
  {
    "id": "fe38badb-1839-472f-afa0-b20c2c93670c",
    "name": "Sun A",
    "type": "section",
    "items": [
      {
        "id": "b1f567c1-e168-43a2-bef7-a13dee8605d4",
        "sets": 3,
        "type": "group_block",
        "items": [
          {
            "id": "a3a8c685-0e84-4913-b8e3-5e6b327f99b8",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
          },
          {
            "id": "17500ce6-b4e8-4fb2-99c1-27e623971b28",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "4f16026a-380b-43fd-a8ab-602a6960d68c"
          },
          {
            "id": "e0236440-1904-4ab9-93cf-c1b3400caa8e",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "297b2971-49c3-40ea-8d09-1070565e1e44"
          },
          {
            "id": "04fec724-c0bc-446a-9355-fff5f5e303f7",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "4f16026a-380b-43fd-a8ab-602a6960d68c"
          },
          {
            "id": "a6f6a693-b5cc-4b5a-8d94-ba938f3ea157",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "78984ea5-d3ab-4a13-9931-950ae511b923"
          },
          {
            "id": "dd7f1611-020a-486d-9cb0-7b1c107bebdd",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "bbce488f-a84c-4d67-b961-874599864a1d"
          },
          {
            "id": "e5223e3b-01d7-4891-bb2a-517867a39de7",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "78984ea5-d3ab-4a13-9931-950ae511b923"
          },
          {
            "id": "20ddadb0-1386-49a7-adcd-aa9fbe563985",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "4f16026a-380b-43fd-a8ab-602a6960d68c"
          },
          {
            "id": "a722fcf1-77c8-4bd4-ac45-f3d88dccf597",
            "type": "pose_instance",
            "duration": "00:06",
            "poseVariationId": "e98bd72f-8ba3-418b-b557-e7c27de47ce4"
          }
        ],
        "roundOverrides": [
          {
            "sets": 1,
            "items": [
              {
                "id": "f1b9e8c9-dbc3-406c-9c84-15c31357aefa",
                "type": "pose_instance",
                "duration": "00:06",
                "poseVariationId": "e974d3ca-be6e-4d02-afd0-848fcf6545f1"
              },
              {
                "id": "0d5a5a37-267e-4d31-9bb4-06178bb249cd",
                "type": "pose_instance",
                "duration": "00:06",
                "poseVariationId": "33aa4a98-2fa7-4e7f-b3c7-8b818f078962"
              },
              {
                "id": "6d5563a5-4438-4545-b4df-b50d8cebe55c",
                "type": "pose_instance",
                "duration": "00:06",
                "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
              }
            ],
            "round": 1
          },
          {
            "sets": 4,
            "items": [
              {
                "id": "1d829701-d014-4b0e-896e-09e7d3d3ff2c",
                "type": "pose_instance",
                "duration": "00:06",
                "poseVariationId": "355a654b-fb8c-4bf4-b14b-4c8bd8e68495"
              },
              {
                "id": "ecb5079f-492d-4c9f-a6cb-c8ab366866fe",
                "type": "pose_instance",
                "duration": "00:09",
                "poseVariationId": "7ba5bfb1-6369-4ae8-b0c0-a466a34a6422"
              }
            ],
            "round": 2
          },
          {
            "sets": 4,
            "items": [
              {
                "id": "3d23ac19-29de-4886-a7ef-df31bcf4ccad",
                "type": "pose_instance",
                "duration": "00:06",
                "poseVariationId": "6c606892-056f-4aa6-8a5b-6abc70b0d385"
              },
              {
                "id": "53872b2e-5adc-4a98-8454-7c8045d8d18c",
                "type": "pose_instance",
                "duration": "00:09",
                "poseVariationId": "7ba5bfb1-6369-4ae8-b0c0-a466a34a6422"
              }
            ],
            "round": 3
          }
        ],
        "itemSubstitutes": []
      }
    ]
  },
  {
    "id": "23903732-4f49-4eaf-bbe8-24abe0261a8e",
    "name": "Squat Series",
    "type": "section",
    "items": [
      {
        "id": "ec1db0c6-44bd-4e40-9148-b6fa7c0ee5e3",
        "sets": 2,
        "type": "group_block",
        "items": [
          {
            "id": "a0db7c61-a71c-4546-936d-18c087454834",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "b7c5e42e-d3fb-4591-8334-846fcd0a401d"
          },
          {
            "id": "5a8d3acd-60df-47ec-9b67-eca812c399a1",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "84a642fc-a71c-4182-9b54-68602c99cf9a"
          }
        ],
        "roundOverrides": [
          {
            "sets": 1,
            "items": [
              {
                "id": "34487fba-65fa-42b3-ae1f-c3fe92f63aa2",
                "type": "pose_instance",
                "duration": "00:30",
                "poseVariationId": "03f81b7d-a806-493b-9c19-ce412b149fd0"
              }
            ],
            "round": 1
          },
          {
            "sets": 1,
            "items": [
              {
                "id": "433852d6-b25e-43cb-91a3-a5ae3f786ec7",
                "type": "pose_instance",
                "duration": "00:30",
                "poseVariationId": "b102ded7-076c-4727-a937-0f4c1219871b"
              }
            ],
            "round": 2
          }
        ],
        "itemSubstitutes": []
      }
    ]
  },
  {
    "id": "137810eb-67fd-4044-88b0-d00cade0e64c",
    "name": "Sun B Bodyweight",
    "type": "section",
    "items": [
      {
        "id": "78b9a729-63f5-4a94-9c46-57428a1f5fec",
        "type": "pose_instance",
        "duration": "00:15",
        "poseVariationId": "03dbeba7-2d43-4e19-b7a4-2b35cda9d33e"
      },
      {
        "id": "63cc0bc1-3b26-44b3-8e11-7742555dc0e3",
        "type": "pose_instance",
        "duration": "00:05",
        "poseVariationId": "daa8b2c8-5f00-414d-ae81-38f0253c93a3"
      },
      {
        "id": "fc57817a-0c10-4359-87a2-dfe5212b5c7d",
        "sets": 2,
        "type": "group_block",
        "items": [
          {
            "id": "d7f1d2ac-ebaf-4f8c-ab4a-21010e26ad4a",
            "type": "pose_instance",
            "duration": "00:07",
            "poseVariationId": "96503c27-6589-49bf-af33-da07acfb16ae"
          },
          {
            "id": "63fd6e0c-dbdb-4818-ada6-60470ab51655",
            "type": "pose_instance",
            "duration": "00:08",
            "poseVariationId": "8a06392c-edcc-4756-9300-4647733daa35"
          },
          {
            "id": "d59b41d3-e289-4a98-8a82-c126008d3079",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "7d4c93ee-c2e5-44ef-af81-2d382c378d7c"
          },
          {
            "id": "a5b30e81-0135-4d12-ad6f-04f0cfd21f3c",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "c39a93fe-f812-4bc9-abda-c9bba674b3db"
          },
          {
            "id": "f447539b-f08d-47d9-814a-84092a03dffd",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "7d4c93ee-c2e5-44ef-af81-2d382c378d7c"
          },
          {
            "id": "71f17324-bd57-40b0-b006-dfe9b37a5029",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "d8290162-725b-487f-9549-7eb3039678cd"
          },
          {
            "id": "cae7034d-648c-4964-9c9e-31d12560c624",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "55b2dca6-d153-4ce5-a035-834a81229020"
          },
          {
            "id": "1b8a7437-1c59-483c-a0c0-cf53aeba3cf3",
            "type": "pose_instance",
            "duration": "00:08",
            "poseVariationId": "e611e57f-759b-4338-b174-8040b87ac8f5"
          },
          {
            "id": "cc2e3b15-8c83-4bd0-bc53-e4d2bc461a6c",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "55b2dca6-d153-4ce5-a035-834a81229020"
          },
          {
            "id": "34be8f06-56ae-4dfa-b261-c9ad1bb35059",
            "type": "pose_instance",
            "duration": "00:04",
            "poseVariationId": "d8290162-725b-487f-9549-7eb3039678cd"
          },
          {
            "id": "bf15912a-f2e4-4c55-b75c-ba2843bcd794",
            "type": "pose_instance",
            "duration": "00:03",
            "poseVariationId": "5c0b9a60-6dba-47d5-94d3-f7175237b953"
          },
          {
            "id": "eaa9fd55-a65e-4782-8f7c-eda3c5d10689",
            "type": "pose_instance",
            "duration": "00:08",
            "poseVariationId": "daa8b2c8-5f00-414d-ae81-38f0253c93a3"
          },
          {
            "id": "df85f59b-dad2-4d8d-80b3-63101a3bda6a",
            "type": "pose_instance",
            "duration": "00:03",
            "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
          }
        ],
        "roundOverrides": [],
        "itemSubstitutes": []
      }
    ]
  },
  {
    "id": "475af93f-0354-4c16-b620-f41b595c64f4",
    "name": "Sun B Weighted",
    "type": "section",
    "items": [
      {
        "id": "9fe1c271-11db-4338-b4f2-3bef2e7e92c1",
        "type": "pose_instance",
        "duration": "00:05",
        "poseVariationId": "4f16026a-380b-43fd-a8ab-602a6960d68c"
      },
      {
        "id": "394da744-a4a0-4cfd-a9bd-735fe9d6465d",
        "type": "pose_instance",
        "duration": "00:15",
        "poseVariationId": "dbde5ef3-1e43-4aae-a010-9303984bed62"
      },
      {
        "id": "f7b4f6cd-7ba9-486c-a762-4a028b32e844",
        "type": "pose_instance",
        "duration": "00:15",
        "poseVariationId": "ed7f4164-ec8c-4630-957e-5331d4ce9350"
      },
      {
        "id": "9b7ec817-7a7a-4683-9309-c22b11a96b91",
        "type": "pose_instance",
        "duration": "00:10",
        "poseVariationId": "dbde5ef3-1e43-4aae-a010-9303984bed62"
      },
      {
        "id": "3ec3a4a4-7f72-4e03-9e70-72bf18c52ea9",
        "type": "pose_instance",
        "duration": "00:05",
        "poseVariationId": "4f16026a-380b-43fd-a8ab-602a6960d68c"
      },
      {
        "id": "b8e74b3a-a8b8-45b7-b430-2d5686f83376",
        "type": "pose_instance",
        "duration": "00:10",
        "poseVariationId": "daa8b2c8-5f00-414d-ae81-38f0253c93a3"
      },
      {
        "id": "6f18d057-a805-4d39-bd28-ed535ebfeab3",
        "sets": 2,
        "type": "group_block",
        "items": [
          {
            "id": "25d9955d-77f6-4f73-8fca-78222bac84c1",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
          },
          {
            "id": "c450e1ee-c70e-49f8-8b68-ca6ee6a6aefb",
            "type": "pose_instance",
            "duration": "00:15",
            "poseVariationId": "96503c27-6589-49bf-af33-da07acfb16ae"
          },
          {
            "id": "630cf4d7-d33a-46cb-86de-cc73f0ac5cc5",
            "type": "pose_instance",
            "duration": "00:15",
            "poseVariationId": "8a06392c-edcc-4756-9300-4647733daa35"
          },
          {
            "id": "c93783b0-89cd-4f58-ae4f-bb5fe419c21a",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "67b3a4a9-2e50-4834-8c01-289e2cd6c0ad"
          },
          {
            "id": "57e0aa35-6513-4c02-9cb7-dd538077ffc2",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "7d4c93ee-c2e5-44ef-af81-2d382c378d7c"
          },
          {
            "id": "5a8e7920-7580-4a8b-ba67-135d7f96281d",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "4898b221-dc24-48b2-ac18-03d9e279be81"
          },
          {
            "id": "bf559657-04a9-49ba-a7b8-0047edd6cc39",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "7493b29f-2a46-4926-96ab-8d98c1344532"
          },
          {
            "id": "b4444842-2b46-4dfd-be64-a4e59b0a2360",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "d8290162-725b-487f-9549-7eb3039678cd"
          },
          {
            "id": "d2521db2-d17a-4cbf-8590-d845cbb24143",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "7493b29f-2a46-4926-96ab-8d98c1344532"
          },
          {
            "id": "31f4fb2d-d5a0-4871-b3b0-09a7ec4eede5",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "5c0b9a60-6dba-47d5-94d3-f7175237b953"
          },
          {
            "id": "5d38f9e4-a7be-4a5d-8ef5-abe19b503316",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "e98bd72f-8ba3-418b-b557-e7c27de47ce4"
          }
        ],
        "roundOverrides": [
          {
            "sets": 1,
            "items": [
              {
                "id": "d4719145-c065-4c83-9947-7edf42e32971",
                "type": "pose_instance",
                "duration": "00:30",
                "poseVariationId": "cde127f8-daef-4fdc-b82f-f17f85ba8dd8"
              }
            ],
            "round": 1
          },
          {
            "sets": 1,
            "items": [
              {
                "id": "2afd48e1-e95a-4612-a140-77689d94e963",
                "type": "pose_instance",
                "duration": "00:30",
                "poseVariationId": "d2a79638-4461-4747-a13f-1334fc6ba406"
              }
            ],
            "round": 2
          }
        ],
        "itemSubstitutes": []
      }
    ]
  },
  {
    "id": "bc9d18dd-f0a5-443f-9960-7908a0d4c5b1",
    "name": "Cardio Round 1",
    "type": "section",
    "items": [
      {
        "id": "11cd41cc-02e3-4910-8bdb-be7d586927f6",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "9bb49fb9-d26f-4e36-b3db-772eae1a7959"
      },
      {
        "id": "c0b6401c-fe5e-402a-aa7f-b8b4faa301ef",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "226e21bc-bcc1-4159-8cb3-6765085949b5"
      },
      {
        "id": "25914f2f-6034-4222-8619-afc1356a830e",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "e6e0d59a-e55d-4b3c-ab11-8ceb998027f8"
      },
      {
        "id": "c03b790a-fe9f-4e8d-af7c-5f64c214fdac",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "434868ab-201b-4b74-8c27-66e5236d98c9"
      },
      {
        "id": "b4d5fe1c-d192-45a9-822e-9b0d3dbbb6be",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "b40ddbcb-3cb3-4a18-bf4b-349e4377b3a0"
      },
      {
        "id": "5548b3cc-2551-41ec-9f7c-2d85914da496",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "f555a82a-d379-4d30-8e39-48847d170843"
      },
      {
        "id": "fc9f4619-8b7f-4c7a-9668-089ad77bcc23",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "35a082b7-cb33-428c-a454-ca7fa6d7b276"
      },
      {
        "id": "53fd8670-7d8a-4126-b562-cad0e72ae430",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "92fd6b5e-f7ca-430f-897a-f4cc30eb11ba"
      }
    ]
  },
  {
    "id": "a9546a31-47c6-4ae3-8d28-66da97b7ab06",
    "name": "Sun B Sculpt Series",
    "type": "section",
    "items": [
      {
        "id": "cb9acbff-4a78-402d-8fc7-8221625cd904",
        "type": "pose_instance",
        "duration": "00:15",
        "poseVariationId": "79e15347-8543-441b-9b4b-b42374a0efb2"
      },
      {
        "id": "f0bfea12-38b2-4d63-8611-aaa2a8fcfc3e",
        "type": "pose_instance",
        "duration": "00:20",
        "poseVariationId": "cfef48b9-716f-4981-81c8-bbe46d78c453"
      },
      {
        "id": "dad8b449-edce-4d3e-96f7-56c79d3f91f6",
        "type": "pose_instance",
        "duration": "00:10",
        "poseVariationId": "daa8b2c8-5f00-414d-ae81-38f0253c93a3"
      },
      {
        "id": "1773e985-e415-4eb3-acd6-c46edf85cb75",
        "type": "pose_instance",
        "duration": "00:05",
        "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
      },
      {
        "id": "346360a5-7fed-47fa-89d0-c54f2356aa11",
        "sets": 2,
        "type": "group_block",
        "items": [
          {
            "id": "bdc9750d-21ac-4b1e-ac87-585fad9046b2",
            "type": "pose_instance",
            "duration": "00:20",
            "poseVariationId": "96503c27-6589-49bf-af33-da07acfb16ae"
          },
          {
            "id": "980c094a-3449-4002-be10-6e58d147cab6",
            "type": "pose_instance",
            "duration": "00:20",
            "poseVariationId": "8a06392c-edcc-4756-9300-4647733daa35"
          },
          {
            "id": "2f422c32-26ca-4326-9b72-55407c054ad8",
            "type": "pose_instance",
            "duration": "00:10",
            "poseVariationId": "7d4c93ee-c2e5-44ef-af81-2d382c378d7c"
          },
          {
            "id": "5af5b9a5-3b62-416b-a480-c1a777f0e3c8",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "9b46395a-48b9-414e-8682-667712a55298"
          },
          {
            "id": "7d171793-eb10-4310-9646-ef47dca0d510",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "7d4c93ee-c2e5-44ef-af81-2d382c378d7c"
          },
          {
            "id": "89a12da5-7fa4-409c-a9b9-3ab6d29fa123",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "5c57ae1e-445f-42e1-b4e0-d9392c8e4392"
          },
          {
            "id": "2dc9d74e-6807-48b1-83b2-c3f19c139680",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "55b2dca6-d153-4ce5-a035-834a81229020"
          },
          {
            "id": "12fa68a2-b8e9-4b0d-a473-632f9185bc76",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "0c61e749-9d69-4188-bcba-28aaa5204784"
          },
          {
            "id": "f0954953-7faa-4c67-ad89-06a3b7af4d40",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "5b8b6cea-120a-410a-91e8-8fbbe657a614"
          },
          {
            "id": "1daa32e4-a6dc-433c-b86e-f3829ede6ff6",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "55b2dca6-d153-4ce5-a035-834a81229020"
          },
          {
            "id": "b5e54242-9333-4e31-97c9-1d452cbce2b7",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "d8290162-725b-487f-9549-7eb3039678cd"
          },
          {
            "id": "c9fdff6b-aea6-423d-a473-1eafc0838063",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "5c0b9a60-6dba-47d5-94d3-f7175237b953"
          },
          {
            "id": "5ca99e9b-c574-46ae-aef8-073becee3d50",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "e98bd72f-8ba3-418b-b557-e7c27de47ce4"
          },
          {
            "id": "39827925-f040-4a00-b3db-e15fc9445f75",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "68e47242-371a-41d8-98fe-185c5fff02a9"
          },
          {
            "id": "9402bf2d-8152-436a-8268-909228a8e67f",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "d73861dc-5af3-489f-ac5a-96c3a3e34f00"
          },
          {
            "id": "a8ab0139-e1ec-44c4-b5f5-384c5d529f6a",
            "type": "pose_instance",
            "duration": "00:15",
            "poseVariationId": "daa8b2c8-5f00-414d-ae81-38f0253c93a3"
          }
        ],
        "roundOverrides": [],
        "itemSubstitutes": [
          {
            "round": 2,
            "itemIndex": 3,
            "substituteItem": {
              "id": "50be7ace-2747-4ef5-8837-a7e1b78726e7",
              "type": "pose_instance",
              "duration": "00:30",
              "poseVariationId": "33153d8f-c423-45e8-a811-b15058769557"
            }
          },
          {
            "round": 2,
            "itemIndex": 5,
            "substituteItem": {
              "id": "05db0158-0fb4-407a-8ffe-82bc4ed1a7c5",
              "type": "pose_instance",
              "duration": "00:30",
              "poseVariationId": "b7f9fd94-522e-408a-b3d5-90b938f8931a"
            }
          },
          {
            "round": 2,
            "itemIndex": 7,
            "substituteItem": {
              "id": "bd140523-ee94-4ec1-b119-5bfa97016943",
              "type": "pose_instance",
              "duration": "00:30",
              "poseVariationId": "14452765-7955-433f-b30a-dc7d80cd3bba"
            }
          },
          {
            "round": 2,
            "itemIndex": 8,
            "substituteItem": {
              "id": "b49db2af-a3ae-4831-a26a-9c2f5a55e53c",
              "type": "pose_instance",
              "duration": "00:30",
              "poseVariationId": "2bbfbb39-23a4-451a-8fd9-40e5d6cc2eaa"
            }
          }
        ]
      }
    ]
  },
  {
    "id": "147e562b-fa48-4267-a180-ee8ac1f00e6c",
    "name": "Cardio Round 2",
    "type": "section",
    "items": [
      {
        "id": "efe34f62-33c6-4512-b63b-e1dc84b8f6d1",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "9bb49fb9-d26f-4e36-b3db-772eae1a7959"
      },
      {
        "id": "74ff7f10-48cb-4c96-9f02-a5bc8600bba1",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "36b4bb78-f406-4bd3-971c-fe90d8582050"
      },
      {
        "id": "4f72dbfc-669b-45dd-b52d-ea4161c18cad",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "4bb65721-8d6b-4945-a608-9f4f59176fd5"
      },
      {
        "id": "88e8dc23-c266-4aee-9b62-e43b9652ecdd",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "5e412f40-d282-48be-9b96-7191c5268d9a"
      },
      {
        "id": "a6a1adc7-dfc8-4e22-9d56-385d81418cf0",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "b40ddbcb-3cb3-4a18-bf4b-349e4377b3a0"
      },
      {
        "id": "67d995e6-8253-4adb-89e0-9cdbd50274b9",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "36b4bb78-f406-4bd3-971c-fe90d8582050"
      },
      {
        "id": "35b34619-a330-45d7-b52c-6c13fbc40b51",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "4414e903-837d-4e8c-9c61-b5640e782da3"
      },
      {
        "id": "2e78043c-1c18-42de-b652-6fb3f4cfef66",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "4d0dc2ae-9d03-414d-a57f-8d4ccd22d41f"
      }
    ]
  },
  {
    "id": "27255d54-a8fd-4d27-b3b4-43271e7a32e3",
    "name": "Final Sculpt Series",
    "type": "section",
    "items": [
      {
        "id": "7ebde569-796d-4dc8-82a1-9dc025882c1f",
        "sets": 2,
        "type": "group_block",
        "items": [
          {
            "id": "60a00fb9-4c2c-475f-b99e-cf5dd07b2bc8",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "1d14eef9-4e9c-4a28-9143-b1317551048b"
          },
          {
            "id": "ce2c2727-5760-416d-baf4-46bf524ea5b0",
            "type": "pose_instance",
            "duration": "00:15",
            "poseVariationId": "918830b6-a646-4bd0-97cf-b39d99c48d29"
          },
          {
            "id": "695c86bb-e6a1-485b-9014-6a801e655d11",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "7d4c93ee-c2e5-44ef-af81-2d382c378d7c"
          },
          {
            "id": "c47aad7b-90bb-47b6-9d08-946563e5393d",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "0e0218bc-64c2-406b-8406-8e3ec6a214c9"
          },
          {
            "id": "9af289db-a349-41b7-aeec-db13229599c4",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "20078408-b56f-43e4-8e5b-c49b7d2c7bf4"
          },
          {
            "id": "664c6bb2-4b08-4bb3-bee0-5abd9192c50f",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "23b2ea27-f972-4a97-af8a-8e4f723847df"
          },
          {
            "id": "a25bd2bd-44bb-4da6-9f33-4bcdd2bf5c8f",
            "type": "pose_instance",
            "duration": "00:20",
            "poseVariationId": "e98bd72f-8ba3-418b-b557-e7c27de47ce4"
          },
          {
            "id": "b32d1151-d942-4dcc-9626-e545beeb9adc",
            "type": "pose_instance",
            "duration": "00:30",
            "poseVariationId": "7ba18f2e-6457-4593-85e3-5fef2368c9cd"
          },
          {
            "id": "f97b8b41-9063-41df-a8c5-32d77227e552",
            "type": "pose_instance",
            "duration": "00:10",
            "poseVariationId": "daa8b2c8-5f00-414d-ae81-38f0253c93a3"
          },
          {
            "id": "83490092-a84a-4e14-8c62-88aea9ec3bff",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "adf96118-7dd2-4d62-be2f-7b4bc2fb35e7"
          },
          {
            "id": "0236a539-e694-467a-adea-64f841637054",
            "type": "pose_instance",
            "duration": "00:05",
            "poseVariationId": "4f16026a-380b-43fd-a8ab-602a6960d68c"
          }
        ],
        "roundOverrides": [],
        "itemSubstitutes": []
      }
    ]
  },
  {
    "id": "461e40c4-4865-4b62-9f00-e39e6b1a8a3e",
    "name": "Core & Supine",
    "type": "section",
    "items": [
      {
        "id": "cf5f0760-d663-4f3d-ba48-82836cb5a376",
        "type": "pose_instance",
        "duration": "00:50",
        "poseVariationId": "45c0b7b4-e03a-44ef-b04a-c16f6ad7a98e"
      },
      {
        "id": "80dff3a3-8c35-4635-8f69-bdbf7eb19e8c",
        "type": "pose_instance",
        "duration": "00:50",
        "poseVariationId": "c59616ab-7a7d-4c50-8794-484dba2abbb1"
      },
      {
        "id": "b07ddaea-0a12-41f3-8747-dc5610db1373",
        "type": "pose_instance",
        "duration": "00:50",
        "poseVariationId": "03f8e9a7-6a88-46e2-8bb9-a52e31a9d768"
      },
      {
        "id": "fbe3360c-1946-429a-ac77-55a8a93e0f61",
        "type": "pose_instance",
        "duration": "00:50",
        "poseVariationId": "1d35f94d-b095-429f-a56e-ef7e125ac017"
      },
      {
        "id": "2b77cf9e-583e-42cc-aafa-8f88749679dc",
        "type": "pose_instance",
        "duration": "00:50",
        "poseVariationId": "88064c82-7b34-43c2-921d-531bb2fed630"
      },
      {
        "id": "27c15c2e-b7bb-4bbe-9f79-2044f125fc25",
        "type": "pose_instance",
        "duration": "00:50",
        "poseVariationId": "a9d8766c-42b3-4da5-bdc8-2e0c8dcae7e8"
      }
    ]
  },
  {
    "id": "7519dedb-9512-4e49-ab29-810fc45f8391",
    "name": "Cool Down",
    "type": "section",
    "items": [
      {
        "id": "209fb310-05bd-4dab-b147-7008201c44b2",
        "type": "pose_instance",
        "duration": "01:45",
        "poseVariationId": "6c200850-fb2f-4879-943a-c66a7a9452ce"
      },
      {
        "id": "29e0f9a5-ba89-4af5-abbb-34350fecc96a",
        "type": "pose_instance",
        "duration": "01:45",
        "poseVariationId": "262bd42f-79b2-479a-b950-690f6bd4791c"
      },
      {
        "id": "c6ce625d-2ee9-40ab-ad9e-07fb35f85bfd",
        "type": "pose_instance",
        "duration": "01:45",
        "poseVariationId": "a5e8cd85-99bc-4598-97a1-dbf461e2f620"
      },
      {
        "id": "42052164-ec2a-48fa-b914-403c507622ee",
        "type": "pose_instance",
        "duration": "01:00",
        "poseVariationId": "50df7088-20f4-43e1-bd9b-684e14a9984d"
      },
      {
        "id": "6421fc7d-2d1f-415f-9fc0-6d5c0e4c7e06",
        "type": "pose_instance",
        "duration": "00:30",
        "poseVariationId": "c09a5cb3-f7ec-44b0-8510-8df4db080b55"
      },
      {
        "id": "232db2ad-9b5b-4e19-be0e-4eb90dd92397",
        "type": "pose_instance",
        "duration": "03:15",
        "poseVariationId": "73b17cf6-a1df-46ed-9d4f-b1746af378ea"
      }
    ]
  }
];

// Function to generate new UUIDs for template items to avoid conflicts
export function generateTemplateWithNewIds(template: Section[]): Section[] {
  const generateNewId = () => generateUUID();
  
  const processItem = (item: any): any => {
    if (item.type === 'pose_instance') {
      return {
        ...item,
        id: generateNewId()
      };
    } else if (item.type === 'group_block') {
      return {
        ...item,
        id: generateNewId(),
        items: item.items.map(processItem),
        roundOverrides: item.roundOverrides?.map((override: any) => ({
          ...override,
          items: override.items.map(processItem)
        })) || [],
        itemSubstitutes: item.itemSubstitutes?.map((substitute: any) => ({
          ...substitute,
          substituteItem: processItem(substitute.substituteItem)
        })) || []
      };
    }
    return item;
  };

  return template.map(section => ({
    ...section,
    id: generateNewId(),
    items: section.items.map(processItem)
  }));
}
