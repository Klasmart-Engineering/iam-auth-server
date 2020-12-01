#Setup
npm i
docker run -d --name=cassandra1 --net=host cassandra

#Restart
docker start cassandra1
npm start